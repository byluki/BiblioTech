<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ejemplar;
use App\Models\HistorialActividad;
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
            'estado' => ['sometimes', 'in:disponible,prestado,reservado,extraviado,fuera_de_circulacion'],
            'ubicacion_fisica' => ['nullable', 'string'],
        ]);

        $ejemplar = Ejemplar::create($data);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'ejemplares', $ejemplar->id);

        return response()->json($ejemplar, 201);
    }

    // GET /ejemplares/{id}
    public function show(Ejemplar $ejemplar)
    {
        return $ejemplar->load('libro', 'prestamos');
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
    // Usado por bibliotecario/admin para marcar: deteriorado, extraviado, fuera de circulación, disponible...
    public function cambiarEstado(Request $request, Ejemplar $ejemplar)
    {
        $data = $request->validate([
            'estado' => ['required', 'in:disponible,prestado,reservado,extraviado,fuera_de_circulacion'],
            'observaciones' => ['nullable', 'string'],
        ]);

        if ($data['estado'] === 'prestado' && $ejemplar->prestamoActivo()->exists()) {
            return response()->json(['message' => 'El ejemplar ya tiene un préstamo activo.'], 422);
        }

        $ejemplar->update($data);

        HistorialActividad::registrar(
            $request->user()?->id,
            'cambio_estado',
            'ejemplares',
            $ejemplar->id,
            "Nuevo estado: {$data['estado']}"
        );

        return response()->json($ejemplar);
    }

    // DELETE /ejemplares/{id}
    public function destroy(Request $request, Ejemplar $ejemplar)
    {
        $ejemplar->delete();

        HistorialActividad::registrar($request->user()?->id, 'baja', 'ejemplares', $ejemplar->id);

        return response()->json(null, 204);
    }
}
