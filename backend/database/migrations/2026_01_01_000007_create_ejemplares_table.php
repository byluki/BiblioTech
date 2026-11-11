<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ejemplares', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_interno')->unique();
            $table->foreignId('libro_id')->constrained('libros')->cascadeOnDelete();
            $table->enum('estado', [
                'disponible',
                'prestado',
                'reservado',
                'extraviado',
                'fuera_de_circulacion',
            ])->default('disponible');
            $table->string('ubicacion_fisica')->nullable();
            $table->text('observaciones')->nullable(); // deteriorado / extraviado / fuera de circulación
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ejemplares');
    }
};
