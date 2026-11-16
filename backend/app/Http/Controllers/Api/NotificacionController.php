<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacion;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    // GET /notificaciones  (soporta ?socio_id=; un socio autenticado solo ve las suyas)
    public function index(Request $request)
    {
        $query = Notificacion::query();

        $usuario = $request->user();

        if ($usuario?->esSocio()) {
            $query->where('socio_id', $usuario->socio?->id);
        } elseif ($socioId = $request->get('socio_id')) {
            $query->where('socio_id', $socioId);
        }

        return $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));
    }

    // POST /notificaciones  (envío manual desde el panel de administrador)
    public function store(Request $request)
    {
        $data = $request->validate([
            'socio_id' => ['required', 'exists:socios,id'],
            'titulo' => ['required', 'string', 'max:150'],
            'mensaje' => ['required', 'string'],
        ]);

        $data['tipo'] = 'manual';

        return response()->json(Notificacion::create($data), 201);
    }

    // GET /notificaciones/{id}
    public function show(Request $request, Notificacion $notificacion)
    {
        if (! $this->puedeVer($request, $notificacion)) {
            return response()->json(['message' => 'No podés ver la notificación de otro socio.'], 403);
        }

        return $notificacion;
    }

    // PATCH /notificaciones/{id}/leer
    // Al visualizar la notificación, el socio la marca como leída automáticamente.
    public function leer(Request $request, Notificacion $notificacion)
    {
        if (! $this->puedeVer($request, $notificacion)) {
            return response()->json(['message' => 'No podés modificar la notificación de otro socio.'], 403);
        }

        if (! $notificacion->leida) {
            $notificacion->update(['leida' => true, 'fecha_leida' => now()]);
        }

        return response()->json($notificacion);
    }

    // gestión ve todas; el socio solo las suyas
    private function puedeVer(Request $request, Notificacion $notificacion): bool
    {
        $usuario = $request->user();

        if ($usuario->esAdministrador() || $usuario->esBibliotecario()) {
            return true;
        }

        return $usuario->socio && (int) $notificacion->socio_id === (int) $usuario->socio->id;
    }
}
