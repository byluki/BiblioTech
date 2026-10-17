<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // 'foto_portada' era un string (VARCHAR 255): alcanza para una URL,
    // pero el frontend permite elegir una imagen local y la manda como
    // base64 (ver public/script.js, convertirImagenABase64()), que
    // fácilmente supera esos 255 caracteres y tiraba
    // "SQLSTATE[22001]: String data, right truncated". Se pasa a
    // longText (hasta 4GB) para que quepa cualquier imagen razonable.
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