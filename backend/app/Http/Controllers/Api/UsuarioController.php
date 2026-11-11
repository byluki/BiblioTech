<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialActividad;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    // GET /usuarios
    public function index(Request $request)
    {
        return Usuario::with('rol')->paginate($request->integer('per_page', 20));
    }

    // POST /usuarios
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'unique:usuarios,email'],
            'password' => ['required', 'string', 'min:6'],
            'rol_id' => ['required', 'exists:roles,id'],
            'activo' => ['boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $usuario = Usuario::create($data);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'usuarios', $usuario->id);

        return response()->json($usuario, 201);
    }

    // GET /usuarios/{id}
    public function show(Usuario $usuario)
    {
        return $usuario->load('rol');
    }

    // PUT /usuarios/{id}
    public function update(Request $request, Usuario $usuario)
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'unique:usuarios,email,' . $usuario->id],
            'password' => ['sometimes', 'string', 'min:6'],
            'rol_id' => ['sometimes', 'exists:roles,id'],
            'activo' => ['boolean'],
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $usuario->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'usuarios', $usuario->id);

        return response()->json($usuario);
    }

    // DELETE /usuarios/{id}
    public function destroy(Request $request, Usuario $usuario)
    {
        $usuario->delete();

        HistorialActividad::registrar($request->user()?->id, 'baja', 'usuarios', $usuario->id);

        return response()->json(null, 204);
    }
}
