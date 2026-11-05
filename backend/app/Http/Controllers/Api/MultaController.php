<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialActividad;
use App\Models\Multa;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MultaController extends Controller
{
    // GET /multas
    // Filtros: ?socio_id=, ?estado=pendiente|pagada, ?metodo_pago=,
    // ?buscar= (nombre, apellido, cédula o n.º de socio del usuario)
    public function index(Request $request)
    {
        $query = Multa::with('socio', 'prestamo');

        if ($socioId = $request->get('socio_id')) {
            $query->where('socio_id', $socioId);
        }

        if ($estado = $request->get('estado')) {
            $query->where('estado', $estado);
        }

        if ($metodo = $request->get('metodo_pago')) {
            $query->where('metodo_pago', $metodo);
        }

        if ($buscar = trim((string) $request->get('buscar'))) {
            $query->whereHas('socio', function ($q) use ($buscar) {
                $q->where(function ($q2) use ($buscar) {
                    $q2->where('nombre', 'like', "%{$buscar}%")
                        ->orWhere('apellido', 'like', "%{$buscar}%")
                        ->orWhere('cedula', 'like', "%{$buscar}%")
                        ->orWhere('numero_socio', 'like', "%{$buscar}%");

                    $partes = preg_split('/\s+/', $buscar, 2);
                    if (count($partes) === 2) {
                        $q2->orWhere(function ($q3) use ($partes) {
                            $q3->where('nombre', 'like', "%{$partes[0]}%")
                                ->where('apellido', 'like', "%{$partes[1]}%");
                        });
                    }
                });
            });
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
            'monto' => ['required', 'numeric', 'min:1', 'max:'.Multa::MONTO_MAXIMO],
            'fecha' => ['sometimes', 'date'],
        ], [
            'monto.min' => 'El monto tiene que ser mayor a 0.',
            'monto.max' => 'El monto máximo de una multa es $ '.number_format(Multa::MONTO_MAXIMO, 0, ',', '.').'.',
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
    // Para marcarla como pagada hay que indicar el método de pago.
    public function update(Request $request, Multa $multa)
    {
        $data = $request->validate([
            'monto' => ['sometimes', 'numeric', 'min:1', 'max:'.Multa::MONTO_MAXIMO],
            'estado' => ['sometimes', 'in:pendiente,pagada'],
            'metodo_pago' => ['required_if:estado,pagada', 'nullable', Rule::in(Multa::METODOS_PAGO)],
        ], [
            'metodo_pago.required_if' => 'Elegí el método de pago.',
            'metodo_pago.in' => 'El método de pago no es válido.',
        ]);

        if (($data['estado'] ?? null) === 'pagada') {
            $data['fecha_pago'] = now()->toDateString();
            $data['monto_pagado'] = $data['monto'] ?? $multa->monto;
        } elseif (($data['estado'] ?? null) === 'pendiente') {
            $data['metodo_pago'] = null;
            $data['fecha_pago'] = null;
            $data['monto_pagado'] = 0;
        }

        $multa->update($data);

        HistorialActividad::registrar($request->user()?->id, 'modificacion', 'multas', $multa->id);

        return response()->json($multa->load('socio'));
    }

    // POST /multas/{id}/pago   { "monto": 150, "metodo_pago": "efectivo" }
    // Registra un pago, total o parcial. La multa pasa a "pagada" cuando lo
    // pagado llega al monto de la multa.
    public function pagar(Request $request, Multa $multa)
    {
        if ($multa->estado === 'pagada') {
            return response()->json(['message' => 'Esta multa ya está pagada.'], 422);
        }

        $saldo = $multa->saldo;

        $data = $request->validate([
            'monto' => ['required', 'numeric', 'min:1', 'max:'.$saldo],
            'metodo_pago' => ['required', Rule::in(Multa::METODOS_PAGO)],
        ], [
            'monto.required' => 'Ingresá el monto que se paga.',
            'monto.min' => 'El monto tiene que ser mayor a 0.',
            'monto.max' => 'El monto no puede ser mayor a lo que se debe ($ '.number_format($saldo, 0, ',', '.').').',
            'metodo_pago.required' => 'Elegí el método de pago.',
            'metodo_pago.in' => 'El método de pago no es válido.',
        ]);

        $pagado = round((float) $multa->monto_pagado + (float) $data['monto'], 2);
        $completa = $pagado >= (float) $multa->monto;

        $multa->update([
            'monto_pagado' => $pagado,
            'metodo_pago' => $data['metodo_pago'],
            'estado' => $completa ? 'pagada' : 'pendiente',
            'fecha_pago' => $completa ? now()->toDateString() : null,
        ]);

        HistorialActividad::registrar(
            $request->user()?->id,
            'pago',
            'multas',
            $multa->id,
            "Pago de {$data['monto']} ({$data['metodo_pago']})"
        );

        return response()->json($multa->load('socio'));
    }

    // GET /mis-multas  (socio logueado: sus multas pendientes y el total a pagar)
    public function misMultas(Request $request)
    {
        $socio = $request->user()?->socio;

        if (! $socio) {
            return response()->json(['multas' => [], 'total' => 0]);
        }

        $multas = Multa::where('socio_id', $socio->id)
            ->where('estado', 'pendiente')
            ->orderBy('fecha')
            ->get();

        return response()->json([
            'multas' => $multas,
            'total' => round($multas->sum(fn ($m) => $m->saldo), 2),
        ]);
    }

    // DELETE /multas/{id}  (anulación de multa)
    public function destroy(Request $request, Multa $multa)
    {
        $multa->delete();

        HistorialActividad::registrar($request->user()?->id, 'anulacion', 'multas', $multa->id);

        return response()->json(null, 204);
    }
}
