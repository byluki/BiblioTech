<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    // GET /categorias
    public function index()
    {
        return Categoria::orderBy('nombre')->get();
    }

    // POST /categorias
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'unique:categorias,nombre'],
        ]);

        return response()->json(Categoria::create($data), 201);
    }

    // PUT /categorias/{id}
    public function update(Request $request, Categoria $categoria)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'unique:categorias,nombre,' . $categoria->id],
        ]);

        $categoria->update($data);

        return response()->json($categoria);
    }

    // DELETE /categorias/{id}
    public function destroy(Categoria $categoria)
    {
        $categoria->delete();

        return response()->json(null, 204);
    }
}
