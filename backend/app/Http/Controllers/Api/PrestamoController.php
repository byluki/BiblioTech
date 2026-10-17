<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ejemplar;
use App\Models\HistorialActividad;
use App\Models\Prestamo;
use App\Models\Reserva;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrestamoController extends Controller
{
    // Reglas simples de negocio configurables (podrían moverse a una tabla "configuracion")
    private const PLAZO_PRESTAMO_DIAS = 14;
    private const MAX_RENOVACIONES = 2;

    // GET /prestamos  (soporta ?estado=, ?socio_id=, ?vencidos=1)
    public function index(Request $request)
    {
        $query = Prestamo::with('socio', 'ejemplar.libro');

        if ($estado = $request->get('estado')) {
            $query->where('estado', $estado);
        }

        if ($socioId = $request->get('socio_id')) {
            $query->where('socio_id', $socioId);
        }

        if ($request->boolean('vencidos')) {
            $query->where('estado', 'activo')->where('fecha_vencimiento', '<', now());
        }

        return $query->orderByDesc('fecha_prestamo')->paginate($request->integer('per_page', 20));
    }

    // POST /prestamos
    public function store(Request $request)
    {
        $data = $request->validate([
            'socio_id' => ['required', 'exists:socios,id'],
            'ejemplar_id' => ['required', 'exists:ejemplares,id'],
        ]);

        return DB::transaction(function () use ($data, $request) {
            $socio = Socio::lockForUpdate()->findOrFail($data['socio_id']);
            $ejemplar = Ejemplar::lockForUpdate()->findOrFail($data['ejemplar_id']);

            if (! $socio->estaActivo()) {
                return response()->json(['message' => 'El socio no está activo y no puede retirar préstamos.'], 422);
            }

            // Si el ejemplar está "reservado", solo puede prestarse si hay una
            // reserva pendiente de retiro para ese mismo ejemplar y socio
            // (es decir, el socio viene a retirar lo que tenía apartado).
            $reservaPendienteRetiro = null;

            if ($ejemplar->estado === 'reservado') {
                $reservaPendienteRetiro = Reserva::where('ejemplar_id', $ejemplar->id)
                    ->where('estado', 'pendiente_retiro')
                    ->first();

                if (! $reservaPendienteRetiro || (int) $reservaPendienteRetiro->socio_id !== (int) $socio->id) {
                    return response()->json(['message' => 'El ejemplar está reservado para otro socio.'], 422);
                }
            } elseif ($ejemplar->estado !== 'disponible') {
                return response()->json(['message' => 'El ejemplar no está disponible para préstamo.'], 422);
            }

            // Regla: un ejemplar no puede tener más de un préstamo activo a la vez.
            if (Prestamo::where('ejemplar_id', $ejemplar->id)->where('estado', 'activo')->exists()) {
                return response()->json(['message' => 'El ejemplar ya tiene un préstamo activo.'], 422);
            }

            $fechaPrestamo = now()->toDateString();
            $fechaVencimiento = now()->addDays(self::PLAZO_PRESTAMO_DIAS)->toDateString();

            $prestamo = Prestamo::create([
                'socio_id' => $socio->id,
                'ejemplar_id' => $ejemplar->id,
                'usuario_id' => $request->user()->id,
                'fecha_prestamo' => $fechaPrestamo,
                'fecha_vencimiento' => $fechaVencimiento,
                'estado' => 'activo',
            ]);

            $ejemplar->update(['estado' => 'prestado']);

            if ($reservaPendienteRetiro) {
                $reservaPendienteRetiro->update(['estado' => 'confirmada']);
            }

            HistorialActividad::registrar($request->user()->id, 'prestamo', 'prestamos', $prestamo->id);

            return response()->json($prestamo->load('socio', 'ejemplar.libro'), 201);
        });
    }

    // GET /prestamos/{id}
    public function show(Prestamo $prestamo)
    {
        return $prestamo->load('socio', 'ejemplar.libro', 'usuario', 'multas');
    }

    // PATCH /prestamos/{id}/devolver
    public function devolver(Request $request, Prestamo $prestamo)
    {
        if ($prestamo->estado !== 'activo') {
            return response()->json(['message' => 'El préstamo no está activo.'], 422);
        }

        return DB::transaction(function () use ($request, $prestamo) {
            $vencido = $prestamo->fecha_vencimiento->isPast();

            $prestamo->update([
                'estado' => 'devuelto',
                'fecha_devolucion' => now()->toDateString(),
            ]);

            $ejemplar = $prestamo->ejemplar;

            // Si hay una reserva pendiente sobre el libro, el ejemplar pasa a "reservado"
            // y se marca la reserva más antigua como pendiente de retiro.
            $reserva = Reserva::where('libro_id', $ejemplar->libro_id)
                ->where('estado', 'pendiente')
                ->oldest('fecha_reserva')
                ->first();

            if ($reserva) {
                $ejemplar->update(['estado' => 'reservado']);
                $reserva->update([
                    'ejemplar_id' => $ejemplar->id,
                    'estado' => 'pendiente_retiro',
                    'fecha_limite' => now()->addDays(2)->toDateString(),
                ]);
            } else {
                $ejemplar->update(['estado' => 'disponible']);
            }

            if ($vencido) {
                $request->attributes->set('devolucion_tardia', true);
            }

            HistorialActividad::registrar(
                $request->user()?->id,
                'devolucion',
                'prestamos',
                $prestamo->id,
                $vencido ? 'Devolución fuera de fecha' : null
            );

            return response()->json($prestamo->fresh(['socio', 'ejemplar.libro']));
        });
    }

    // PATCH /prestamos/{id}/renovar
    public function renovar(Request $request, Prestamo $prestamo)
    {
        if ($prestamo->estado !== 'activo') {
            return response()->json(['message' => 'Solo se pueden renovar préstamos activos.'], 422);
        }

        // Regla: no debe estar vencido.
        if ($prestamo->fecha_vencimiento->isPast()) {
            return response()->json(['message' => 'No se puede renovar un préstamo vencido.'], 422);
        }

        // Regla: el ejemplar no debe tener una reserva pendiente de otro socio.
        $tieneReservaPendiente = Reserva::where('libro_id', $prestamo->ejemplar->libro_id)
            ->whereIn('estado', ['pendiente', 'pendiente_retiro'])
            ->exists();

        if ($tieneReservaPendiente) {
            return response()->json(['message' => 'No se puede renovar: el libro tiene una reserva pendiente.'], 422);
        }

        if ($prestamo->cantidad_renovaciones >= self::MAX_RENOVACIONES) {
            return response()->json(['message' => 'Se alcanzó el máximo de renovaciones permitidas.'], 422);
        }

        $prestamo->update([
            'fecha_vencimiento' => $prestamo->fecha_vencimiento->addDays(self::PLAZO_PRESTAMO_DIAS),
            'cantidad_renovaciones' => $prestamo->cantidad_renovaciones + 1,
        ]);

        HistorialActividad::registrar($request->user()?->id, 'renovacion', 'prestamos', $prestamo->id);

        return response()->json($prestamo);
    }

    // PATCH /prestamos/{id}/anular
    public function anular(Request $request, Prestamo $prestamo)
    {
        if ($prestamo->estado !== 'activo') {
            return response()->json(['message' => 'Solo se pueden anular préstamos activos.'], 422);
        }

        $prestamo->update(['estado' => 'anulado']);
        $prestamo->ejemplar->update(['estado' => 'disponible']);

        HistorialActividad::registrar($request->user()?->id, 'anulacion', 'prestamos', $prestamo->id);

        return response()->json($prestamo);
    }
}
