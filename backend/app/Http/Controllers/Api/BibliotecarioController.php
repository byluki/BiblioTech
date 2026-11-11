<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bibliotecario;
use App\Models\HistorialActividad;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class BibliotecarioController extends Controller
{
    // GET /bibliotecarios
    public function index()
    {
        return Bibliotecario::with('usuario')->get();
    }

    // POST /bibliotecarios  (crea el usuario de acceso + el registro de bibliotecario)
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'apellido' => ['required', 'string', 'max:150'],
            'cedula' => ['required', 'string', 'unique:bibliotecarios,cedula'],
            'telefono' => ['nullable', 'string'],
            'email' => ['required', 'email', 'unique:usuarios,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $rolBibliotecario = Rol::where('nombre', 'bibliotecario')->firstOrFail();

        $usuario = Usuario::create([
            'nombre' => $data['nombre'] . ' ' . $data['apellido'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'rol_id' => $rolBibliotecario->id,
        ]);

        $bibliotecario = Bibliotecario::create([
            'usuario_id' => $usuario->id,
            'nombre' => $data['nombre'],
            'apellido' => $data['apellido'],
            'cedula' => $data['cedula'],
            'telefono' => $data['telefono'] ?? null,
        ]);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'bibliotecarios', $bibliotecario->id);

        return response()->json($bibliotecario->load('usuario'), 201);
    }

    // GET /bibliotecarios/{id}
    public function show(Bibliotecario $bibliotecario)
    {
        return $bibliotecario->load('usuario');
    }

    // PUT /bibliotecarios/{id}
    public function update(Request $request, Bibliotecario $bibliotecario)
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:150'],
            'apellido' => ['sometimes', 'string', 'max:150'],
            'telefono' => ['nullable', 'string'],
            'activo' => ['boolean'],
        ]);

        $bibliotecario->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'bibliotecarios', $bibliotecario->id);

        return response()->json($bibliotecario);
    }

    // DELETE /bibliotecarios/{id}
    public function destroy(Request $request, Bibliotecario $bibliotecario)
    {
        $bibliotecario->usuario?->update(['activo' => false]);
        $bibliotecario->update(['activo' => false]);

        HistorialActividad::registrar($request->user()?->id, 'baja', 'bibliotecarios', $bibliotecario->id);

        return response()->json(null, 204);
    }
}
