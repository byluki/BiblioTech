<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialActividad;
use App\Models\Libro;
use App\Models\Prestamo;
use Illuminate\Http\Request;

class LibroController extends Controller
{
    // GET /libros  (soporta ?buscar=, ?categoria_id=)
    public function index(Request $request)
    {
        $query = Libro::with('categoria')->withCount('ejemplares');

        if ($buscar = $request->get('buscar')) {
            $query->where(function ($q) use ($buscar) {
                $q->where('titulo', 'like', "%{$buscar}%")
                    ->orWhere('autor', 'like', "%{$buscar}%")
                    ->orWhere('isbn', 'like', "%{$buscar}%");
            });
        }

        if ($categoriaId = $request->get('categoria_id')) {
            $query->where('categoria_id', $categoriaId);
        }

        return $query->paginate($request->integer('per_page', 20));
    }

    // POST /libros
    public function store(Request $request)
    {
        $data = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'autor' => ['required', 'string', 'max:255'],
            'editorial' => ['nullable', 'string'],
            'anio_edicion' => ['nullable', 'digits:4'],
            'isbn' => ['nullable', 'string'],
            'categoria_id' => ['nullable', 'exists:categorias,id'],
            'descripcion' => ['nullable', 'string'],
            'foto_portada' => ['nullable', 'string'],
        ]);

        $libro = Libro::create($data);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'libros', $libro->id);

        return response()->json($libro, 201);
    }

    // GET /libros/{id}
    public function show(Libro $libro)
    {
        return $libro->load('categoria', 'ejemplares');
    }

    // PUT /libros/{id}
    public function update(Request $request, Libro $libro)
    {
        $data = $request->validate([
            'titulo' => ['sometimes', 'string', 'max:255'],
            'autor' => ['sometimes', 'string', 'max:255'],
            'editorial' => ['nullable', 'string'],
            'anio_edicion' => ['nullable', 'digits:4'],
            'isbn' => ['nullable', 'string'],
            'categoria_id' => ['nullable', 'exists:categorias,id'],
            'descripcion' => ['nullable', 'string'],
            'foto_portada' => ['nullable', 'string'],
        ]);

        $libro->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'libros', $libro->id);

        return response()->json($libro);
    }

    // DELETE /libros/{id}
    // Si el libro tiene ejemplares con préstamos activos (todavía no
    // devueltos) no se puede dar de baja: primero hay que resolver esos
    // préstamos. Si solo tiene historial de préstamos ya cerrados, se
    // hace una baja lógica (soft delete): el libro deja de verse en el
    // catálogo pero sus ejemplares y el historial de préstamos se
    // conservan intactos (la FK de `prestamos` hacia `ejemplares` no
    // permite borrarlos físicamente, ver migración de ejemplares).
    public function destroy(Request $request, Libro $libro)
    {
        $ejemplarIds = $libro->ejemplares()->pluck('id');

        $tienePrestamosActivos = $ejemplarIds->isNotEmpty()
            && Prestamo::whereIn('ejemplar_id', $ejemplarIds)
                ->whereIn('estado', ['activo', 'vencido'])
                ->exists();

        if ($tienePrestamosActivos) {
            return response()->json([
                'message' => 'No se puede eliminar el libro: tiene ejemplares actualmente prestados. '
                    .'Esperá a que se devuelvan antes de eliminarlo.',
            ], 422);
        }

        $libro->delete();

        HistorialActividad::registrar($request->user()?->id, 'baja', 'libros', $libro->id);

        return response()->json(null, 204);
    }
}
