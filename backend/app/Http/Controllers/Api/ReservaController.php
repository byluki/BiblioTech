<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ejemplar;
use App\Models\HistorialActividad;
use App\Models\Reserva;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservaController extends Controller
{
    // Administrador y bibliotecario ("gestión") pueden ver/gestionar las
    // reservas de cualquier socio; un socio común solo puede ver, crear y
    // cancelar las suyas propias.
    private function esGestion(Request $request): bool
    {
        $usuario = $request->user();

        return $usuario && ($usuario->esAdministrador() || $usuario->esBibliotecario());
    }

    // GET /reservas  (soporta ?socio_id=, ?estado=)
    public function index(Request $request)
    {
        $query = Reserva::with('socio', 'libro');

        if ($this->esGestion($request)) {
            // Gestión sí puede filtrar por cualquier socio.
            if ($socioId = $request->get('socio_id')) {
                $query->where('socio_id', $socioId);
            }
        } else {
            // Un socio común solo puede ver sus propias reservas, sin
            // importar qué socio_id le pida al endpoint: no tiene forma
            // de "espiar" las reservas de otro.
            $socioPropio = $request->user()?->socio;
            $query->where('socio_id', $socioPropio?->id ?? 0);
        }

        if ($estado = $request->get('estado')) {
            $query->where('estado', $estado);
        }

        return $query->orderByDesc('fecha_reserva')->paginate($request->integer('per_page', 20));
    }

    // POST /reservas
    public function store(Request $request)
    {
        $data = $request->validate([
            'socio_id' => ['required', 'exists:socios,id'],
            'libro_id' => ['required', 'exists:libros,id'],
            'fecha_deseada' => ['required', 'date', 'after_or_equal:today'],
        ]);

        // Un socio común solo puede reservar a su propio nombre: si mandó
        // un socio_id distinto al suyo (a mano, sin pasar por la UI), se
        // rechaza en vez de crear la reserva a nombre de otra persona.
        if (! $this->esGestion($request)) {
            $socioPropio = $request->user()?->socio;

            if (! $socioPropio || (int) $data['socio_id'] !== (int) $socioPropio->id) {
                return response()->json(['message' => 'Solo podés reservar a tu propio nombre.'], 403);
            }
        }

        return DB::transaction(function () use ($data, $request) {
            $socio = Socio::findOrFail($data['socio_id']);

            // Regla: solo un socio activo puede reservar.
            if (! $socio->estaActivo()) {
                return response()->json(['message' => 'El socio no está activo y no puede reservar.'], 422);
            }

            // Regla: no más de una reserva activa para el mismo libro.
            $yaTieneReserva = Reserva::where('socio_id', $socio->id)
                ->where('libro_id', $data['libro_id'])
                ->whereIn('estado', ['pendiente', 'pendiente_retiro'])
                ->exists();

            if ($yaTieneReserva) {
                return response()->json(['message' => 'El socio ya tiene una reserva activa para este libro.'], 422);
            }

            // Regla: mientras el socio no esté verificado como centro
            // educativo por un bibliotecario (Socio::esCentroEducativoVerificado),
            // opera igual que un particular y solo puede tener 1 reserva
            // activa en total (contando todos los libros, no solo este).
            // Un centro educativo ya verificado no tiene ese límite.
            if (! $socio->esCentroEducativoVerificado()) {
                $tieneOtraReservaActiva = Reserva::where('socio_id', $socio->id)
                    ->whereIn('estado', ['pendiente', 'pendiente_retiro'])
                    ->exists();

                if ($tieneOtraReservaActiva) {
                    return response()->json([
                        'message' => 'Ya tenés una reserva activa. Un usuario particular (o un centro educativo todavía no verificado por un bibliotecario) solo puede tener una reserva a la vez.',
                    ], 422);
                }
            }

            // Si hay un ejemplar disponible en este momento, se marca directamente
            // como pendiente de retiro; si no, queda en cola ("pendiente").
            $ejemplarDisponible = Ejemplar::where('libro_id', $data['libro_id'])
                ->where('estado', 'disponible')
                ->first();

            $reserva = Reserva::create([
                'socio_id' => $socio->id,
                'libro_id' => $data['libro_id'],
                'ejemplar_id' => $ejemplarDisponible?->id,
                'fecha_reserva' => now()->toDateString(),
                'fecha_deseada' => $data['fecha_deseada'],
                'fecha_limite' => $ejemplarDisponible ? now()->addDays(2)->toDateString() : null,
                'estado' => $ejemplarDisponible ? 'pendiente_retiro' : 'pendiente',
            ]);

            if ($ejemplarDisponible) {
                $ejemplarDisponible->update(['estado' => 'reservado']);
            }

            HistorialActividad::registrar($request->user()?->id, 'reserva', 'reservas', $reserva->id);

            return response()->json($reserva->load('socio', 'libro'), 201);
        });
    }

    // GET /reservas/{id}
    public function show(Request $request, Reserva $reserva)
    {
        if (! $this->esGestion($request)) {
            $socioPropio = $request->user()?->socio;

            if (! $socioPropio || (int) $reserva->socio_id !== (int) $socioPropio->id) {
                return response()->json(['message' => 'No podés ver la reserva de otro socio.'], 403);
            }
        }

        return $reserva->load('socio', 'libro', 'ejemplar');
    }

    // PATCH /reservas/{id}/confirmar
    // El bibliotecario confirma la entrega del libro reservado -> se convierte en préstamo
    // (delegar la creación real del préstamo a PrestamoController desde el frontend,
    // acá solo se actualiza el estado de la reserva).
    public function confirmar(Request $request, Reserva $reserva)
    {
        if ($reserva->estado !== 'pendiente_retiro') {
            return response()->json(['message' => 'La reserva no está lista para retiro.'], 422);
        }

        $reserva->update(['estado' => 'confirmada']);

        HistorialActividad::registrar($request->user()?->id, 'reserva_confirmada', 'reservas', $reserva->id);

        return response()->json($reserva);
    }

    // PATCH /reservas/{id}/cancelar
    public function cancelar(Request $request, Reserva $reserva)
    {
        // Un socio común solo puede cancelar su propia reserva; gestión
        // (administrador/bibliotecario) puede cancelar cualquiera.
        if (! $this->esGestion($request)) {
            $socioPropio = $request->user()?->socio;

            if (! $socioPropio || (int) $reserva->socio_id !== (int) $socioPropio->id) {
                return response()->json(['message' => 'No podés cancelar la reserva de otro socio.'], 403);
            }
        }

        if (in_array($reserva->estado, ['confirmada', 'cancelada'], true)) {
            return response()->json(['message' => 'La reserva ya fue confirmada o cancelada.'], 422);
        }

        return DB::transaction(function () use ($request, $reserva) {
            // Si había un ejemplar apartado para esta reserva, se libera.
            if ($reserva->ejemplar_id) {
                $reserva->ejemplar->update(['estado' => 'disponible']);
            }

            $reserva->update(['estado' => 'cancelada']);

            HistorialActividad::registrar($request->user()?->id, 'reserva_cancelada', 'reservas', $reserva->id);

            return response()->json($reserva);
        });
    }
}
