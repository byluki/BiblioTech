<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('multas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('socio_id')->constrained('socios');
            $table->foreignId('prestamo_id')->nullable()->constrained('prestamos')->nullOnDelete();
            $table->enum('motivo', ['atraso', 'perdida', 'deterioro']);
            $table->decimal('monto', 10, 2);
            $table->date('fecha');
            $table->enum('estado', ['pendiente', 'pagada'])->default('pendiente');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('multas');
    }
};
