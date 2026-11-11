<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            // baja lógica: oculta el libro sin perder su historial de préstamos
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
