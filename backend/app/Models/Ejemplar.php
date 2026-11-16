<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ejemplar extends Model
{
    // la tabla es "ejemplares"
    protected $table = 'ejemplares';

    protected $fillable = ['codigo_interno', 'libro_id', 'estado', 'ubicacion_fisica', 'observaciones'];

    // incluye libros dados de baja, para no perder el historial
    public function libro()
    {
        return $this->belongsTo(Libro::class)->withTrashed();
    }

    public function prestamos()
    {
        return $this->hasMany(Prestamo::class);
    }

    public function prestamoActivo()
    {
        return $this->hasOne(Prestamo::class)->whereIn('estado', ['activo', 'vencido']);
    }
}
