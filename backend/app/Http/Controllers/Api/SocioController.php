<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialActividad;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SocioController extends Controller
{
    // GET /socios  (soporta ?buscar= para búsqueda rápida por nombre/apellido/cédula)
    public function index(Request $request)
    {
        $query = Socio::query();

        if ($buscar = $request->get('buscar')) {
            $query->where(function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                    ->orWhere('apellido', 'like', "%{$buscar}%")
                    ->orWhere('cedula', 'like', "%{$buscar}%")
                    ->orWhere('numero_socio', 'like', "%{$buscar}%");

                // También permitir búsquedas por nombre completo, por ejemplo
                // "Lucas Cabrera" cuando nombre/apellido están separados.
                $partes = preg_split('/\s+/', trim($buscar), 2);
                if (count($partes) === 2) {
                    $q->orWhere(function ($q2) use ($partes) {
                        $q2->where('nombre', 'like', "%{$partes[0]}%")
                            ->where('apellido', 'like', "%{$partes[1]}%");
                    });
                }
            });
        }

        return $query->paginate($request->integer('per_page', 20));
    }

    // POST /socios
    public function store(Request $request)
    {
        $data = $request->validate([
            // Estos campos siguen siendo aceptados cuando el administrador los
            // proporciona, pero ahora son opcionales para los formularios
            // rápidos de alta/reserva del frontend.
            'numero_socio' => ['sometimes', 'string', 'unique:socios,numero_socio'],
            'foto' => ['nullable', 'string'],
            'nombre' => ['required', 'string', 'max:150'],
            'apellido' => ['sometimes', 'string', 'max:150'],
            'cedula' => ['sometimes', 'string', 'unique:socios,cedula'],
            'direccion' => ['nullable', 'string'],
            'telefono' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'fecha_alta' => ['sometimes', 'date'],
            'tipo' => ['required', 'in:particular,centro_educativo'],
            'estado' => ['sometimes', 'in:activo,suspendido,inactivo'],
        ]);

        // El frontend puede crear un socio desde "Reservar" o "Prestar"
        // enviando solamente nombre + tipo. La tabla exige numero_socio,
        // apellido, cedula y fecha_alta, por lo que completamos esos datos
        // automáticamente cuando no vienen informados.
        $partesNombre = preg_split('/\s+/', trim($data['nombre']), 2);
        $data['apellido'] = $data['apellido'] ?? ($partesNombre[1] ?? '-');
        $data['numero_socio'] = $data['numero_socio'] ?? 'AUTO-' . strtoupper(Str::random(10));
        $data['cedula'] = $data['cedula'] ?? 'PENDIENTE-' . Str::uuid();
        $data['fecha_alta'] = $data['fecha_alta'] ?? now()->toDateString();
        $data['estado'] = $data['estado'] ?? 'activo';

        $socio = Socio::create($data);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'socios', $socio->id);

        return response()->json($socio, 201);
    }

    // GET /socios/{id}
    public function show(Socio $socio)
    {
        return $socio->load('prestamos', 'reservas', 'multas');
    }

    // PUT /socios/{id}
    public function update(Request $request, Socio $socio)
    {
        $data = $request->validate([
            'foto' => ['nullable', 'string'],
            'nombre' => ['sometimes', 'string', 'max:150'],
            'apellido' => ['sometimes', 'string', 'max:150'],
            'direccion' => ['nullable', 'string'],
            'telefono' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'tipo' => ['sometimes', 'in:particular,centro_educativo'],
        ]);

        $socio->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'socios', $socio->id);

        return response()->json($socio);
    }

    // DELETE /socios/{id}  -> baja lógica (SoftDeletes)
    public function destroy(Request $request, Socio $socio)
    {
        $socio->delete();

        HistorialActividad::registrar($request->user()?->id, 'baja', 'socios', $socio->id);

        return response()->json(null, 204);
    }

    // PATCH /socios/{id}/estado
    public function cambiarEstado(Request $request, Socio $socio)
    {
        $data = $request->validate([
            'estado' => ['required', 'in:activo,suspendido,inactivo'],
        ]);

        $socio->update(['estado' => $data['estado']]);

        HistorialActividad::registrar(
            $request->user()?->id,
            'cambio_estado',
            'socios',
            $socio->id,
            "Nuevo estado: {$data['estado']}"
        );

        return response()->json($socio);
    }

    // PATCH /socios/{id}/verificar-educativo
    // Un bibliotecario o administrador confirma "a mano" (viendo la
    // credencial real del centro educativo) que el socio pertenece de
    // verdad a un centro educativo. Hasta que esto pase, el socio -aunque
    // se haya declarado centro educativo al registrarse- opera igual que
    // un particular (ver Socio::esCentroEducativoVerificado() y
    // ReservaController::store()).
    public function verificarCentroEducativo(Request $request, Socio $socio)
    {
        $data = $request->validate([
            'verificado' => ['sometimes', 'boolean'],
        ]);

        $verificado = $request->has('verificado') ? $data['verificado'] : true;

        $socio->update([
            'verificado_centro_educativo' => $verificado,
            // si se confirma la verificación, dejamos el tipo en
            // centro_educativo (por si no había quedado declarado así);
            // si se revierte, no tocamos el tipo, solo la marca de verificado
            'tipo' => $verificado ? 'centro_educativo' : $socio->tipo,
        ]);

        HistorialActividad::registrar(
            $request->user()?->id,
            $verificado ? 'verificacion_centro_educativo' : 'revocacion_centro_educativo',
            'socios',
            $socio->id
        );

        return response()->json($socio);
    }
}
