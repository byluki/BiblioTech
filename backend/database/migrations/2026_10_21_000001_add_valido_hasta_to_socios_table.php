<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('socios', function (Blueprint $table) {
            // "VÁLIDO" del carnet de biblioteca: fecha hasta la que el carnet
            // del socio está vigente (el carnet físico lo muestra por año).
            $table->date('valido_hasta')->nullable()->after('fecha_alta');
        });
    }

    public function down(): void
    {
        Schema::table('socios', function (Blueprint $table) {
            $table->dropColumn('valido_hasta');
        });
    }
};
