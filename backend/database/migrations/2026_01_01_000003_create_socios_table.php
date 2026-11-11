<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('socios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('numero_socio')->unique();
            $table->string('foto')->nullable();
            $table->string('nombre');
            $table->string('apellido');
            $table->string('cedula')->unique();
            $table->string('direccion')->nullable();
            $table->string('telefono')->nullable();
            $table->string('email')->nullable();
            $table->date('fecha_alta');
            $table->enum('tipo', ['particular', 'centro_educativo'])->default('particular');
            $table->enum('estado', ['activo', 'suspendido', 'inactivo'])->default('activo');
            $table->softDeletes(); // baja lógica
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('socios');
    }
};
