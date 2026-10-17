<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BibliotecarioController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\EjemplarController;
use App\Http\Controllers\Api\LibroController;
use App\Http\Controllers\Api\MultaController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\PrestamoController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\ReservaController;
use App\Http\Controllers\Api\SocioController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rutas públicas (sin sesión)
|--------------------------------------------------------------------------
*/
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/registro', [AuthController::class, 'registro']);

// Catálogo: se puede consultar sin haber iniciado sesión (así funciona el
// modo "invitado" del frontend). Antes estas rutas vivían dentro del
// grupo auth:sanctum de abajo, así que si nadie tenía la sesión iniciada
// en el dispositivo (por ejemplo, se cerró sesión o venció el token en
// una terminal pública de la biblioteca), el catálogo entero desaparecía
// para cualquiera que mirara la pantalla, como si se hubieran borrado los
// libros. Consultar el catálogo no expone nada sensible (solo título,
// autor, categoría, disponibilidad); dar de alta/editar/eliminar libros y
// categorías sigue requiriendo rol administrador (ver más abajo).
Route::get('/libros', [LibroController::class, 'index']);
Route::get('/libros/{libro}', [LibroController::class, 'show']);
Route::get('/categorias', [CategoriaController::class, 'index']);
Route::get('/ejemplares', [EjemplarController::class, 'index']);
Route::get('/ejemplares/{ejemplar}', [EjemplarController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Rutas autenticadas (requieren token de Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // --- Reservas: un socio puede reservar/cancelar su propia reserva ---
    Route::get('/reservas', [ReservaController::class, 'index']);
    Route::post('/reservas', [ReservaController::class, 'store']);
    Route::get('/reservas/{reserva}', [ReservaController::class, 'show']);
    Route::patch('/reservas/{reserva}/cancelar', [ReservaController::class, 'cancelar']);

    // --- Notificaciones: un socio ve/marca leídas las suyas ---
    Route::get('/notificaciones', [NotificacionController::class, 'index']);
    Route::get('/notificaciones/{notificacion}', [NotificacionController::class, 'show']);
    Route::patch('/notificaciones/{notificacion}/leer', [NotificacionController::class, 'leer']);

    /*
    |----------------------------------------------------------------------
    | Solo administrador: alta/edición/baja del catálogo (libros y
    | categorías), y gestión de cuentas de usuario/bibliotecarios.
    |----------------------------------------------------------------------
    */
    Route::middleware('rol:administrador')->group(function () {
        Route::post('/libros', [LibroController::class, 'store']);
        Route::put('/libros/{libro}', [LibroController::class, 'update']);
        Route::delete('/libros/{libro}', [LibroController::class, 'destroy']);

        Route::post('/categorias', [CategoriaController::class, 'store']);
        Route::put('/categorias/{categoria}', [CategoriaController::class, 'update']);
        Route::delete('/categorias/{categoria}', [CategoriaController::class, 'destroy']);

        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::get('/usuarios/{usuario}', [UsuarioController::class, 'show']);
        Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update']);
        Route::delete('/usuarios/{usuario}', [UsuarioController::class, 'destroy']);

        Route::get('/bibliotecarios', [BibliotecarioController::class, 'index']);
        Route::post('/bibliotecarios', [BibliotecarioController::class, 'store']);
        Route::get('/bibliotecarios/{bibliotecario}', [BibliotecarioController::class, 'show']);
        Route::put('/bibliotecarios/{bibliotecario}', [BibliotecarioController::class, 'update']);
        Route::delete('/bibliotecarios/{bibliotecario}', [BibliotecarioController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Administrador o bibliotecario ("gestión"): socios, multas, préstamos
    | (contabilidad), reportes y estado de los ejemplares.
    |----------------------------------------------------------------------
    */
    Route::middleware('rol:administrador,bibliotecario')->group(function () {
        Route::post('/ejemplares', [EjemplarController::class, 'store']);
        Route::put('/ejemplares/{ejemplar}', [EjemplarController::class, 'update']);
        Route::patch('/ejemplares/{ejemplar}/estado', [EjemplarController::class, 'cambiarEstado']);
        Route::delete('/ejemplares/{ejemplar}', [EjemplarController::class, 'destroy']);

        Route::get('/socios', [SocioController::class, 'index']);
        Route::post('/socios', [SocioController::class, 'store']);
        Route::get('/socios/{socio}', [SocioController::class, 'show']);
        Route::put('/socios/{socio}', [SocioController::class, 'update']);
        Route::delete('/socios/{socio}', [SocioController::class, 'destroy']);
        Route::patch('/socios/{socio}/estado', [SocioController::class, 'cambiarEstado']);
        // Verificación de "centro educativo": la hace un bibliotecario/admin
        // a mano, viendo la credencial real del socio (ver SocioController).
        Route::patch('/socios/{socio}/verificar-educativo', [SocioController::class, 'verificarCentroEducativo']);

        Route::get('/multas', [MultaController::class, 'index']);
        Route::post('/multas', [MultaController::class, 'store']);
        Route::get('/multas/{multa}', [MultaController::class, 'show']);
        Route::put('/multas/{multa}', [MultaController::class, 'update']);
        Route::delete('/multas/{multa}', [MultaController::class, 'destroy']);

        Route::get('/prestamos', [PrestamoController::class, 'index']);
        Route::post('/prestamos', [PrestamoController::class, 'store']);
        Route::get('/prestamos/{prestamo}', [PrestamoController::class, 'show']);
        Route::patch('/prestamos/{prestamo}/devolver', [PrestamoController::class, 'devolver']);
        Route::patch('/prestamos/{prestamo}/renovar', [PrestamoController::class, 'renovar']);
        Route::patch('/prestamos/{prestamo}/anular', [PrestamoController::class, 'anular']);

        // El bibliotecario confirma la entrega del libro reservado.
        Route::patch('/reservas/{reserva}/confirmar', [ReservaController::class, 'confirmar']);

        Route::post('/notificaciones', [NotificacionController::class, 'store']);

        Route::get('/reportes/prestamos-por-periodo', [ReporteController::class, 'prestamosPorPeriodo']);
        Route::get('/reportes/libros-mas-prestados', [ReporteController::class, 'librosMasPrestados']);
        Route::get('/reportes/socios-con-atrasos', [ReporteController::class, 'sociosConAtrasos']);
        Route::get('/reportes/disponibilidad-catalogo', [ReporteController::class, 'disponibilidadCatalogo']);
    });
});
