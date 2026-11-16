<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ejemplar;
use App\Models\HistorialActividad;
use App\Models\Reserva;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class EjemplarController extends Controller
{
    // GET /ejemplares  (soporta ?libro_id=, ?estado=)
    public function index(Request $request)
    {
        $query = Ejemplar::with('libro');

        if ($libroId = $request->get('libro_id')) {
            $query->where('libro_id', $libroId);
        }

        if ($estado = $request->get('estado')) {
            $query->where('estado', $estado);
        }

        return $query->paginate($request->integer('per_page', 20));
    }

    // POST /ejemplares
    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo_interno' => ['required', 'string', 'unique:ejemplares,codigo_interno'],
            'libro_id' => ['required', 'exists:libros,id'],
            'estado' => ['sometimes', 'in:disponible,extraviado,fuera_de_circulacion'],
            'ubicacion_fisica' => ['nullable', 'string'],
        ]);

        $ejemplar = Ejemplar::create($data);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'ejemplares', $ejemplar->id);

        return response()->json($ejemplar, 201);
    }

    // GET /ejemplares/{id}
    // es pública: solo datos del ejemplar y su libro, nunca los préstamos
    public function show(Ejemplar $ejemplar)
    {
        return $ejemplar->load('libro')
            ->only(['id', 'codigo_interno', 'libro_id', 'estado', 'ubicacion_fisica', 'libro']);
    }

    // PUT /ejemplares/{id}
    public function update(Request $request, Ejemplar $ejemplar)
    {
        $data = $request->validate([
            'ubicacion_fisica' => ['nullable', 'string'],
            'observaciones' => ['nullable', 'string'],
        ]);

        $ejemplar->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'ejemplares', $ejemplar->id);

        return response()->json($ejemplar);
    }

    // PATCH /ejemplares/{id}/estado
    // "prestado" y "reservado" no se ponen a mano: los manejan préstamos y reservas.
    public function cambiarEstado(Request $request, Ejemplar $ejemplar)
    {
        $data = $request->validate([
            'estado' => ['required', 'in:disponible,extraviado,fuera_de_circulacion'],
            'observaciones' => ['nullable', 'string'],
        ], [
            'estado.in' => 'Ese estado lo manejan los préstamos y reservas, no se cambia a mano.',
        ]);

        return DB::transaction(function () use ($request, $ejemplar, $data) {
            $ejemplar = Ejemplar::lockForUpdate()->findOrFail($ejemplar->id);

            if ($ejemplar->prestamoActivo()->exists()) {
                return response()->json(['message' => 'El ejemplar está prestado. Registrá la devolución primero.'], 422);
            }

            $apartada = Reserva::where('ejemplar_id', $ejemplar->id)
                ->where('estado', 'pendiente_retiro')
                ->lockForUpdate()
                ->first();

            if ($apartada) {
                return response()->json(['message' => 'El ejemplar está apartado para una reserva. Cancelala o confirmala primero.'], 422);
            }

            $ejemplar->update($data);

            // si vuelve a estar disponible y hay socios esperando, se le aparta al primero
            if ($data['estado'] === 'disponible') {
                $siguiente = Reserva::where('libro_id', $ejemplar->libro_id)
                    ->where('estado', 'pendiente')
                    ->oldest('fecha_reserva')
                    ->oldest('id')
                    ->lockForUpdate()
                    ->first();

                if ($siguiente) {
                    $ejemplar->update(['estado' => 'reservado']);
                    $siguiente->update([
                        'ejemplar_id' => $ejemplar->id,
                        'estado' => 'pendiente_retiro',
                        'fecha_limite' => now()->addDays(2)->toDateString(),
                    ]);
                }
            }

            HistorialActividad::registrar(
                $request->user()?->id,
                'cambio_estado',
                'ejemplares',
                $ejemplar->id,
                "Nuevo estado: {$ejemplar->estado}"
            );

            return response()->json($ejemplar);
        });
    }

    // DELETE /ejemplares/{id}
    // Si tiene préstamos o reservas no se borra: se pasa a "fuera de circulación".
    public function destroy(Request $request, Ejemplar $ejemplar)
    {
        return DB::transaction(function () use ($request, $ejemplar) {
            $ejemplar = Ejemplar::lockForUpdate()->findOrFail($ejemplar->id);

            if ($ejemplar->prestamos()->exists() || Reserva::where('ejemplar_id', $ejemplar->id)->exists()) {
                return response()->json([
                    'message' => 'El ejemplar tiene préstamos o reservas registrados. Ponelo "fuera de circulación" en vez de borrarlo.',
                ], 422);
            }

            $ejemplar->delete();

            HistorialActividad::registrar($request->user()?->id, 'baja', 'ejemplares', $ejemplar->id);

            return response()->json(null, 204);
        });
    }
}
