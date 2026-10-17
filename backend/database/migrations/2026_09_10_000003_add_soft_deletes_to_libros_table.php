<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            // Baja lógica: un libro con ejemplares que tienen historial de
            // préstamos no se puede borrar físicamente (la FK de `prestamos`
            // hacia `ejemplares` lo impide, ver LibroController::destroy).
            // Con esto, "eliminar" un libro con historial lo oculta del
            // catálogo sin perder los préstamos ya registrados.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
