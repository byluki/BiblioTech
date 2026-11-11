<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Uso en routes/api.php:
 *   Route::middleware('rol:administrador')->group(...)
 *   Route::middleware('rol:administrador,bibliotecario')->group(...)
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$rolesPermitidos)
    {
        $usuario = $request->user();

        if (! $usuario || ! $usuario->activo) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if (! in_array($usuario->rol?->nombre, $rolesPermitidos, true)) {
            return response()->json(['message' => 'No tiene permisos para esta acción.'], 403);
        }

        return $next($request);
    }
}
