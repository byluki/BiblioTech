<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prestamos', function (Blueprint $table) {
            // estado en que se devolvió el libro (opcional)
            $table->text('observaciones')->nullable()->after('estado');
        });

        Schema::table('multas', function (Blueprint $table) {
            // suma de los pagos registrados; la multa queda pagada cuando llega al monto
            $table->decimal('monto_pagado', 10, 2)->default(0)->after('monto');
        });
    }

    public function down(): void
    {
        Schema::table('prestamos', function (Blueprint $table) {
            $table->dropColumn('observaciones');
        });

        Schema::table('multas', function (Blueprint $table) {
            $table->dropColumn('monto_pagado');
        });
    }
};
