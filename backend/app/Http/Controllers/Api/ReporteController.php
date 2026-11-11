<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ejemplar;
use App\Models\Prestamo;
use App\Models\Socio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    // GET /reportes/prestamos-por-periodo?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
    public function prestamosPorPeriodo(Request $request)
    {
        $data = $request->validate([
            'desde' => ['required', 'date'],
            'hasta' => ['required', 'date', 'after_or_equal:desde'],
        ]);

        $prestamos = Prestamo::with('socio', 'ejemplar.libro')
            ->whereBetween('fecha_prestamo', [$data['desde'], $data['hasta']])
            ->orderBy('fecha_prestamo')
            ->get();

        return response()->json([
            'desde' => $data['desde'],
            'hasta' => $data['hasta'],
            'total' => $prestamos->count(),
            'prestamos' => $prestamos,
        ]);
    }

    // GET /reportes/libros-mas-prestados?limite=5
    public function librosMasPrestados(Request $request)
    {
        $limite = $request->integer('limite', 5);

        $resultado = Prestamo::query()
            ->join('ejemplares', 'ejemplares.id', '=', 'prestamos.ejemplar_id')
            ->join('libros', 'libros.id', '=', 'ejemplares.libro_id')
            ->select('libros.id', 'libros.titulo', 'libros.autor', DB::raw('COUNT(*) as total_prestamos'))
            ->groupBy('libros.id', 'libros.titulo', 'libros.autor')
            ->orderByDesc('total_prestamos')
            ->limit($limite)
            ->get();

        return response()->json($resultado);
    }

    // GET /reportes/socios-con-atrasos
    public function sociosConAtrasos()
    {
        $socios = Socio::whereHas('prestamos', function ($q) {
            $q->where('estado', 'activo')->where('fecha_vencimiento', '<', now());
        })->with(['prestamos' => function ($q) {
            $q->where('estado', 'activo')->where('fecha_vencimiento', '<', now())->with('ejemplar.libro');
        }])->get();

        return response()->json($socios);
    }

    // GET /reportes/disponibilidad-catalogo
    public function disponibilidadCatalogo()
    {
        $totales = Ejemplar::select('estado', DB::raw('COUNT(*) as total'))
            ->groupBy('estado')
            ->pluck('total', 'estado');

        return response()->json([
            'disponibles' => $totales->get('disponible', 0),
            'prestados' => $totales->get('prestado', 0),
            'reservados' => $totales->get('reservado', 0),
            'extraviados' => $totales->get('extraviado', 0),
            'fuera_de_circulacion' => $totales->get('fuera_de_circulacion', 0),
            'total_ejemplares' => $totales->sum(),
        ]);
    }
}
