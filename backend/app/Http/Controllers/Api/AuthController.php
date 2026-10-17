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

class AuthController extends Controller
{
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

        // Requiere laravel/sanctum instalado (php artisan install:api)
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
    // Registro público: siempre crea una cuenta con rol "socio" y tipo
    // "particular" (para administrador/bibliotecario, las cuentas se crean
    // desde UsuarioController/BibliotecarioController, no acá).
    //
    // El registro solo pide nombre, email y contraseña. Como el alta
    // pública no pasa por un bibliotecario, no tenemos cédula ni número de
    // socio reales todavía: se generan automáticamente a partir del id del
    // usuario (únicos por construcción) y quedan como referencia hasta que
    // la biblioteca actualice esos datos.
    //
    // Antes se podía declarar acá mismo "pertenezco a un centro
    // educativo", pero esa declaración no se verificaba: cualquiera podía
    // tildarla al crear la cuenta. Para que el tipo de socio realmente
    // signifique algo, ahora toda cuenta nueva arranca como "particular" y
    // el pase a centro educativo (verificado) solo lo puede hacer un
    // bibliotecario a mano, viendo la credencial real, desde la pestaña de
    // socios (ver SocioController::verificarCentroEducativo).
    public function registro(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:usuarios,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $usuarioYSocio = DB::transaction(function () use ($data, $request) {
            $rolSocio = Rol::where('nombre', 'socio')->firstOrFail();

            $usuario = Usuario::create([
                'nombre' => $data['nombre'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'rol_id' => $rolSocio->id,
                'activo' => true,
            ]);

            $partesNombre = preg_split('/\s+/', trim($data['nombre']), 2);

            $socio = Socio::create([
                'usuario_id' => $usuario->id,
                'numero_socio' => 'AUTO-'.str_pad((string) $usuario->id, 6, '0', STR_PAD_LEFT),
                'nombre' => $partesNombre[0],
                'apellido' => $partesNombre[1] ?? '-',
                // placeholder único (no hay cédula real en el alta pública);
                // un bibliotecario la completa después desde /socios/{id}
                'cedula' => 'PENDIENTE-'.$usuario->id,
                'email' => $usuario->email,
                'fecha_alta' => now()->toDateString(),
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

