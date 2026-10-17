<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ejemplar extends Model
{
    // Sin esto, Eloquent adivina "ejemplars" a partir de la clase (regla en
    // inglés), pero la migración creó la tabla como "ejemplares"
    // (create_ejemplares_table).
    protected $table = 'ejemplares';

    protected $fillable = ['codigo_interno', 'libro_id', 'estado', 'ubicacion_fisica', 'observaciones'];

    public function libro()
    {
        return $this->belongsTo(Libro::class);
    }

    public function prestamos()
    {
        return $this->hasMany(Prestamo::class);
    }

    public function prestamoActivo()
    {
        return $this->hasOne(Prestamo::class)->where('estado', 'activo');
    }
}
