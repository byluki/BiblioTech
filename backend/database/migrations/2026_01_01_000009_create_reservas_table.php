<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('socio_id')->constrained('socios');
            $table->foreignId('libro_id')->constrained('libros');
            $table->foreignId('ejemplar_id')->nullable()->constrained('ejemplares')->nullOnDelete();
            $table->date('fecha_reserva');
            $table->date('fecha_limite')->nullable(); // plazo para retirar una vez disponible
            $table->enum('estado', [
                'pendiente',          // en cola, libro no disponible aún
                'pendiente_retiro',   // ejemplar liberado, esperando que el socio lo retire
                'confirmada',         // convertida en préstamo
                'cancelada',
            ])->default('pendiente');
            $table->timestamps();

            $table->index(['libro_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservas');
    }
};
