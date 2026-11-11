<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Libro extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'titulo', 'autor', 'editorial', 'anio_edicion', 'isbn',
        'categoria_id', 'descripcion', 'foto_portada',
    ];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function ejemplares()
    {
        return $this->hasMany(Ejemplar::class);
    }

    public function reservas()
    {
        return $this->hasMany(Reserva::class);
    }

    public function ejemplaresDisponibles()
    {
        return $this->ejemplares()->where('estado', 'disponible');
    }
}
