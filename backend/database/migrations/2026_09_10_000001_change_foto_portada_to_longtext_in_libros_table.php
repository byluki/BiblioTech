<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // la portada puede ser una imagen en base64: necesita longText
    public function up(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            $table->longText('foto_portada')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            $table->string('foto_portada')->nullable()->change();
        });
    }
};