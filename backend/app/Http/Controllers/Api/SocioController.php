<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialActividad;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

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

                // nombre completo, ej. "Lucas Cabrera"
                $partes = preg_split('/\s+/', trim($buscar), 2);
                if (count($partes) === 2) {
                    $q->orWhere(function ($q2) use ($partes) {
                        $q2->where('nombre', 'like', "%{$partes[0]}%")
                            ->where('apellido', 'like', "%{$partes[1]}%");
                    });
                }
            });
        }

        return $query->orderBy('apellido')->orderBy('nombre')->paginate($request->integer('per_page', 20));
    }

    // POST /socios
    public function store(Request $request)
    {
        $data = $request->validate([
            // opcionales: si no vienen, se completan abajo
            'numero_socio' => ['sometimes', 'string', 'unique:socios,numero_socio'],
            'valido_hasta' => ['sometimes', 'nullable', 'date'],
            'foto' => ['nullable', 'string'],
            'nombre' => ['required', 'string', 'max:150'],
            'apellido' => ['sometimes', 'string', 'max:150'],
            'cedula' => ['sometimes', 'string', 'max:30', 'unique:socios,cedula'],
            'direccion' => ['nullable', 'string'],
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{6,20}$/'],
            'email' => ['required', 'email', 'max:150'],
            'fecha_alta' => ['sometimes', 'date'],
            'tipo' => ['required', 'in:particular,centro_educativo'],
            'estado' => ['sometimes', 'in:activo,suspendido,inactivo'],
        ], [
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'El correo electrónico no es válido.',
            'telefono.regex' => 'El teléfono solo puede tener números (y +, -, espacios o paréntesis).',
        ]);

        // datos que la tabla exige y no vinieron en el pedido
        $partesNombre = preg_split('/\s+/', trim($data['nombre']), 2);
        $data['apellido'] = $data['apellido'] ?? ($partesNombre[1] ?? '-');
        $data['cedula'] = $data['cedula'] ?? 'PENDIENTE-' . Str::uuid();
        $data['numero_socio'] = $data['numero_socio']
            ?? (str_starts_with($data['cedula'], 'PENDIENTE-') ? 'AUTO-' . strtoupper(Str::random(10)) : $data['cedula']);
        $data['fecha_alta'] = $data['fecha_alta'] ?? now()->toDateString();
        $data['estado'] = $data['estado'] ?? 'activo';
        // el carnet vale hasta fin de año si no se indica otra fecha
        $data['valido_hasta'] = $data['valido_hasta'] ?? now()->endOfYear()->toDateString();

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
            'cedula' => ['sometimes', 'string', 'max:30', Rule::unique('socios', 'cedula')->ignore($socio->id)],
            'direccion' => ['nullable', 'string'],
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{6,20}$/'],
            'email' => ['sometimes', 'required', 'email', 'max:150'],
            'valido_hasta' => ['sometimes', 'nullable', 'date'],
            'tipo' => ['sometimes', 'in:particular,centro_educativo'],
        ], [
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'El correo electrónico no es válido.',
            'telefono.regex' => 'El teléfono solo puede tener números (y +, -, espacios o paréntesis).',
        ]);

        // al cargar la cédula real, pasa a ser el código de barras
        if (isset($data['cedula']) && $socio->cedulaPendiente() && !str_starts_with($data['cedula'], 'PENDIENTE-')) {
            $data['numero_socio'] = $data['cedula'];
        }

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
    // Un bibliotecario confirma, con la credencial, que el socio es un
    // centro educativo. Sin esa verificación reserva como particular.
    public function verificarCentroEducativo(Request $request, Socio $socio)
    {
        $data = $request->validate([
            'verificado' => ['sometimes', 'boolean'],
        ]);

        $verificado = $request->has('verificado') ? $data['verificado'] : true;

        $socio->update([
            'verificado_centro_educativo' => $verificado,
            // al verificar queda como centro_educativo; al quitarla no se toca el tipo
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
