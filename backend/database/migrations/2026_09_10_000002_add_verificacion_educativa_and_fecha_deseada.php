<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('socios', function (Blueprint $table) {
            // Un socio puede declararse "centro_educativo" (campo `tipo`, ya
            // existente) al registrarse solo, pero eso es lo que él dice de
            // sí mismo. Este campo es la confirmación real, hecha a mano por
            // un bibliotecario/administrador desde la pestaña de socios
            // (ver SocioController::verificarCentroEducativo). Mientras
            // valga false, el socio reserva como un particular (1 reserva
            // activa como máximo), sin importar lo que haya declarado.
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
