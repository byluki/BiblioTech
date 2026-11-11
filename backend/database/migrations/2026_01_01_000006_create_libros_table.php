<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('libros', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->string('autor');
            $table->string('editorial')->nullable();
            $table->year('anio_edicion')->nullable();
            $table->string('isbn')->nullable()->index();
            $table->foreignId('categoria_id')->nullable()->constrained('categorias')->nullOnDelete();
            $table->text('descripcion')->nullable();
            $table->string('foto_portada')->nullable();
            $table->timestamps();

            $table->fullText(['titulo', 'autor']); // soporte de búsqueda ágil (MySQL)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('libros');
    }
};
