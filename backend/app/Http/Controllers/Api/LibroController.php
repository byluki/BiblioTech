<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ejemplar;
use App\Models\HistorialActividad;
use App\Models\Libro;
use App\Models\Prestamo;
use App\Models\Reserva;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LibroController extends Controller
{
    // Copias que cuentan como "en la biblioteca" (las extraviadas o fuera de
    // circulación no se pueden prestar ni reservar)
    private const ESTADOS_EN_CIRCULACION = ['disponible', 'prestado', 'reservado'];

    private const MAX_COPIAS = 200;

    // GET /libros  (soporta ?buscar=, ?categoria_id=)
    public function index(Request $request)
    {
        $query = Libro::with('categoria')->withCount([
            'ejemplares as copias_count' => fn ($q) => $q->whereIn('estado', self::ESTADOS_EN_CIRCULACION),
            'ejemplares as disponibles_count' => fn ($q) => $q->where('estado', 'disponible'),
        ]);

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
            // cantidad de copias físicas: se crea un ejemplar por cada una
            'cantidad' => ['sometimes', 'integer', 'min:1', 'max:'.self::MAX_COPIAS],
        ], [
            'cantidad.min' => 'Tiene que haber al menos 1 copia.',
            'cantidad.max' => 'Como máximo '.self::MAX_COPIAS.' copias.',
        ]);

        $cantidad = $data['cantidad'] ?? 1;
        unset($data['cantidad']);

        $libro = DB::transaction(function () use ($data, $cantidad) {
            $libro = Libro::create($data);
            $this->crearEjemplares($libro, $cantidad);

            return $libro;
        });

        HistorialActividad::registrar($request->user()?->id, 'alta', 'libros', $libro->id, "Copias: {$cantidad}");

        return response()->json($libro->loadCount([
            'ejemplares as copias_count' => fn ($q) => $q->whereIn('estado', self::ESTADOS_EN_CIRCULACION),
        ]), 201);
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

    // PUT /libros/{id}/cantidad   { "cantidad": N }
    // Ajusta cuántas copias físicas tiene el libro.
    //  - Si sube: se crean los ejemplares que faltan y, si había socios en
    //    espera (reservas "pendiente"), las copias nuevas se les asignan.
    //  - Si baja: solo se pueden quitar copias que estén en la biblioteca
    //    (disponibles). Las que tienen historial de préstamos no se borran:
    //    pasan a "fuera de circulación" para conservar ese historial.
    public function cambiarCantidad(Request $request, Libro $libro)
    {
        $data = $request->validate([
            'cantidad' => ['required', 'integer', 'min:1', 'max:'.self::MAX_COPIAS],
        ], [
            'cantidad.required' => 'Indicá la cantidad de copias.',
            'cantidad.min' => 'Tiene que haber al menos 1 copia.',
            'cantidad.max' => 'Como máximo '.self::MAX_COPIAS.' copias.',
        ]);

        return DB::transaction(function () use ($request, $libro, $data) {
            $enCirculacion = $libro->ejemplares()
                ->whereIn('estado', self::ESTADOS_EN_CIRCULACION)
                ->lockForUpdate()
                ->get();

            $actual = $enCirculacion->count();
            $nueva = (int) $data['cantidad'];

            if ($nueva > $actual) {
                $this->crearEjemplares($libro, $nueva - $actual);
                $this->asignarCopiasAReservasEnEspera($libro);
            } elseif ($nueva < $actual) {
                $aQuitar = $actual - $nueva;
                $disponibles = $enCirculacion->where('estado', 'disponible')->values();

                if ($disponibles->count() < $aQuitar) {
                    $ocupadas = $actual - $disponibles->count();

                    return response()->json([
                        'message' => "No se pueden quitar {$aQuitar} copias: hay {$ocupadas} prestadas o reservadas. "
                            .'Solo se pueden quitar copias que estén en la biblioteca (mínimo posible ahora: '.max(1, $ocupadas).').',
                    ], 422);
                }

                foreach ($disponibles->take($aQuitar) as $ejemplar) {
                    if ($ejemplar->prestamos()->exists()) {
                        $ejemplar->update([
                            'estado' => 'fuera_de_circulacion',
                            'observaciones' => 'Quitado al reducir la cantidad de copias.',
                        ]);
                    } else {
                        $ejemplar->delete();
                    }
                }
            }

            HistorialActividad::registrar(
                $request->user()?->id,
                'modificacion',
                'libros',
                $libro->id,
                "Copias: {$actual} -> {$nueva}"
            );

            return response()->json($libro->fresh()->loadCount([
                'ejemplares as copias_count' => fn ($q) => $q->whereIn('estado', self::ESTADOS_EN_CIRCULACION),
                'ejemplares as disponibles_count' => fn ($q) => $q->where('estado', 'disponible'),
            ]));
        });
    }

    private function crearEjemplares(Libro $libro, int $cantidad): void
    {
        for ($i = 0; $i < $cantidad; $i++) {
            do {
                $codigo = 'EJ-'.$libro->id.'-'.strtoupper(Str::random(6));
            } while (Ejemplar::where('codigo_interno', $codigo)->exists());

            Ejemplar::create([
                'codigo_interno' => $codigo,
                'libro_id' => $libro->id,
                'estado' => 'disponible',
            ]);
        }
    }

    // Las copias libres se asignan, por orden de llegada, a quienes estaban
    // esperando el libro (misma lógica que al devolver un préstamo).
    private function asignarCopiasAReservasEnEspera(Libro $libro): void
    {
        $enEspera = Reserva::where('libro_id', $libro->id)
            ->where('estado', 'pendiente')
            ->oldest('fecha_reserva')
            ->oldest('id')
            ->get();

        foreach ($enEspera as $reserva) {
            $ejemplar = $libro->ejemplares()->where('estado', 'disponible')->first();
            if (! $ejemplar) {
                break;
            }
            $ejemplar->update(['estado' => 'reservado']);
            $reserva->update([
                'ejemplar_id' => $ejemplar->id,
                'estado' => 'pendiente_retiro',
                'fecha_limite' => now()->addDays(2)->toDateString(),
            ]);
        }
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
