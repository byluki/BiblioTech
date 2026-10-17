<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialActividad;
use App\Models\Multa;
use Illuminate\Http\Request;

class MultaController extends Controller
{
    // GET /multas  (soporta ?socio_id=, ?estado=)
    public function index(Request $request)
    {
        $query = Multa::with('socio', 'prestamo');

        if ($socioId = $request->get('socio_id')) {
            $query->where('socio_id', $socioId);
        }

        if ($estado = $request->get('estado')) {
            $query->where('estado', $estado);
        }

        return $query->orderByDesc('fecha')->paginate($request->integer('per_page', 20));
    }

    // POST /multas
    public function store(Request $request)
    {
        $data = $request->validate([
            'socio_id' => ['required', 'exists:socios,id'],
            'prestamo_id' => ['nullable', 'exists:prestamos,id'],
            'motivo' => ['required', 'in:atraso,perdida,deterioro'],
            'monto' => ['required', 'numeric', 'min:0'],
            'fecha' => ['sometimes', 'date'],
        ]);

        $data['fecha'] = $data['fecha'] ?? now()->toDateString();
        $data['estado'] = 'pendiente';

        $multa = Multa::create($data);

        HistorialActividad::registrar($request->user()?->id, 'alta', 'multas', $multa->id);

        return response()->json($multa, 201);
    }

    // GET /multas/{id}
    public function show(Multa $multa)
    {
        return $multa->load('socio', 'prestamo');
    }

    // PUT /multas/{id}
    public function update(Request $request, Multa $multa)
    {
        $data = $request->validate([
            'monto' => ['sometimes', 'numeric', 'min:0'],
            'estado' => ['sometimes', 'in:pendiente,pagada'],
        ]);

        $multa->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'multas', $multa->id);

        return response()->json($multa);
    }

    // DELETE /multas/{id}  (anulación de multa)
    public function destroy(Request $request, Multa $multa)
    {
        $multa->delete();

        HistorialActividad::registrar($request->user()?->id, 'anulacion', 'multas', $multa->id);

        return response()->json(null, 204);
    }
}
