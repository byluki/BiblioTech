<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

// corta cualquier pedido de un usuario desactivado, aunque tenga un token válido
class UsuarioActivo
{
    public function handle(Request $request, Closure $next)
    {
        $usuario = $request->user();

        if ($usuario && ! $usuario->activo) {
            $usuario->currentAccessToken()?->delete();

            return response()->json(['message' => 'Tu usuario está desactivado.'], 401);
        }

        return $next($request);
    }
}
