<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use App\Models\Socio;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    // 8+ caracteres, mayúscula, minúscula y número (igual que en el frontend)
    private const REGEX_PASSWORD = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/';

    private const MENSAJES = [
        'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        'password.regex' => 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.',
        'email.required' => 'El correo electrónico es obligatorio.',
        'email.email' => 'El correo electrónico no es válido.',
        'email.unique' => 'Ya existe una cuenta con ese correo electrónico.',
        'cedula.unique' => 'Ya existe un socio con esa cédula.',
        'telefono.regex' => 'El teléfono solo puede tener números (y +, -, espacios o paréntesis).',
        'acepta_terminos.accepted' => 'Para crear la cuenta tenés que aceptar los Términos y Condiciones y la Política de Privacidad.',
    ];

    // POST /auth/login
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $usuario = Usuario::with('rol', 'socio')->where('email', $data['email'])->first();

        if (! $usuario || ! Hash::check($data['password'], $usuario->password)) {
            return response()->json(['message' => 'Credenciales inválidas.'], 401);
        }

        if (! $usuario->activo) {
            return response()->json(['message' => 'Usuario inactivo.'], 403);
        }

        $token = $usuario->createToken('api-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'email' => $usuario->email,
                'rol' => $usuario->rol?->nombre,
                'socio_id' => $usuario->socio?->id,
            ],
        ]);
    }

    // POST /auth/registro
    // Registro público: crea un usuario con rol "socio" y su carnet (tipo
    // particular). El pase a centro educativo lo hace un bibliotecario.
    // Teléfono y dirección son opcionales; el carnet vale hasta fin de año.
    public function registro(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'apellido' => ['required', 'string', 'max:150'],
            'cedula' => ['required', 'string', 'max:30', 'unique:socios,cedula'],
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{6,20}$/'],
            'direccion' => ['nullable', 'string'],
            'email' => ['required', 'email', 'max:150', 'unique:usuarios,email'],
            'password' => ['required', 'string', 'min:8', 'regex:'.self::REGEX_PASSWORD],
            'acepta_terminos' => ['accepted'],
        ], self::MENSAJES);

        $usuarioYSocio = DB::transaction(function () use ($data, $request) {
            $rolSocio = Rol::where('nombre', 'socio')->firstOrFail();

            $usuario = Usuario::create([
                'nombre' => trim($data['nombre'].' '.$data['apellido']),
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'rol_id' => $rolSocio->id,
                'activo' => true,
            ]);

            $socio = Socio::create([
                'usuario_id' => $usuario->id,
                // código de barras del carnet = cédula
                'numero_socio' => $data['cedula'],
                'nombre' => trim($data['nombre']),
                'apellido' => trim($data['apellido']),
                'cedula' => trim($data['cedula']),
                'telefono' => $data['telefono'] ?? null,
                'direccion' => $data['direccion'] ?? null,
                'email' => $usuario->email,
                'fecha_alta' => now()->toDateString(),
                'valido_hasta' => now()->endOfYear()->toDateString(),
                'tipo' => 'particular',
                'verificado_centro_educativo' => false,
                'estado' => 'activo',
            ]);

            return [$usuario, $rolSocio, $socio];
        });

        [$usuario, $rolSocio, $socio] = $usuarioYSocio;

        $token = $usuario->createToken('api-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'email' => $usuario->email,
                'rol' => $rolSocio->nombre,
                'socio_id' => $socio->id,
            ],
        ], 201);
    }

    // PUT /auth/perfil
    // "Mi cuenta": cada usuario edita sus datos. Para cambiar la contraseña
    // se pide la actual.
    public function actualizarPerfil(Request $request)
    {
        $usuario = $request->user()->load('rol', 'socio');
        $socio = $usuario->socio;

        $reglas = [
            'nombre' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('usuarios', 'email')->ignore($usuario->id)],
            'password' => ['nullable', 'string', 'min:8', 'regex:'.self::REGEX_PASSWORD],
            'password_actual' => ['required_with:password', 'nullable', 'string'],
        ];
        if ($socio) {
            $reglas += [
                'apellido' => ['required', 'string', 'max:150'],
                'cedula' => ['required', 'string', 'max:30', Rule::unique('socios', 'cedula')->ignore($socio->id)],
                'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]{6,20}$/'],
                'direccion' => ['nullable', 'string'],
            ];
        }
        $data = $request->validate($reglas, self::MENSAJES);

        if (! empty($data['password']) && ! Hash::check($data['password_actual'], $usuario->password)) {
            return response()->json(['message' => 'La contraseña actual no es correcta.'], 422);
        }

        DB::transaction(function () use ($data, $usuario, $socio) {
            $cambios = [
                'nombre' => $socio ? trim($data['nombre'].' '.$data['apellido']) : trim($data['nombre']),
                'email' => $data['email'],
            ];
            if (! empty($data['password'])) {
                $cambios['password'] = Hash::make($data['password']);
            }
            $usuario->update($cambios);

            if ($socio) {
                $cedulaNueva = trim($data['cedula']);
                $actualizacion = [
                    'nombre' => trim($data['nombre']),
                    'apellido' => trim($data['apellido']),
                    'cedula' => $cedulaNueva,
                    'telefono' => $data['telefono'] ?? null,
                    'direccion' => $data['direccion'] ?? null,
                    'email' => $data['email'],
                ];
                // el código de barras acompaña a la cédula
                if ($socio->cedulaPendiente() || $socio->numero_socio === $socio->cedula) {
                    $actualizacion['numero_socio'] = $cedulaNueva;
                }
                $socio->update($actualizacion);
            }
        });

        return response()->json([
            'id' => $usuario->id,
            'nombre' => $usuario->nombre,
            'email' => $usuario->email,
            'rol' => $usuario->rol?->nombre,
            'socio_id' => $socio?->id,
        ]);
    }

    // POST /auth/logout
    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    // GET /auth/me
    public function me(Request $request)
    {
        $usuario = $request->user()->load('rol', 'socio', 'bibliotecario');

        return response()->json($usuario);
    }
}

