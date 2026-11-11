<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('socio_id')->constrained('socios');
            $table->string('titulo');
            $table->text('mensaje');
            $table->enum('tipo', [
                'manual',
                'prestamo_por_vencer',
                'prestamo_vencido',
                'reserva_disponible',
            ])->default('manual');
            $table->boolean('leida')->default(false);
            $table->timestamp('fecha_leida')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones');
    }
};
