<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prestamos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('socio_id')->constrained('socios');
            $table->foreignId('ejemplar_id')->constrained('ejemplares');
            $table->foreignId('usuario_id')->constrained('usuarios'); // quién registró la operación
            $table->date('fecha_prestamo');
            $table->date('fecha_vencimiento');
            $table->date('fecha_devolucion')->nullable();
            $table->unsignedTinyInteger('cantidad_renovaciones')->default(0);
            $table->enum('estado', ['activo', 'vencido', 'devuelto', 'anulado'])->default('activo');
            $table->timestamps();

            // Un ejemplar no puede estar en más de un préstamo activo a la vez:
            // esta regla se aplica a nivel de aplicación (ver PrestamoController),
            // ya que depende del estado, no solo de la FK.
            $table->index(['ejemplar_id', 'estado']);
            $table->index(['socio_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prestamos');
    }
};
