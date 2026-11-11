<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('multas', function (Blueprint $table) {
            // Cómo se pagó la multa y cuándo (se completan al marcarla como pagada)
            $table->enum('metodo_pago', ['efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago'])
                ->nullable()
                ->after('estado');
            $table->date('fecha_pago')->nullable()->after('metodo_pago');
        });
    }

    public function down(): void
    {
        Schema::table('multas', function (Blueprint $table) {
            $table->dropColumn(['metodo_pago', 'fecha_pago']);
        });
    }
};
