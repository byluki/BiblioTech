<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// el tipo YEAR de MySQL solo acepta 1901-2155; los clásicos son más viejos
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            $table->unsignedSmallInteger('anio_edicion')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('libros', function (Blueprint $table) {
            $table->year('anio_edicion')->nullable()->change();
        });
    }
};
