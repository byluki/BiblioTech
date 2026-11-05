<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('socios', function (Blueprint $table) {
            // confirmación del bibliotecario de que el socio es un centro educativo
            $table->boolean('verificado_centro_educativo')->default(false)->after('tipo');
        });

        Schema::table('reservas', function (Blueprint $table) {
            // Para cuándo quiere retirar el libro quien reserva.
            $table->date('fecha_deseada')->nullable()->after('fecha_reserva');
        });
    }

    public function down(): void
    {
        Schema::table('socios', function (Blueprint $table) {
            $table->dropColumn('verificado_centro_educativo');
        });

        Schema::table('reservas', function (Blueprint $table) {
            $table->dropColumn('fecha_deseada');
        });
    }
};
