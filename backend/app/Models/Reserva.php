<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reserva extends Model
{
    protected $fillable = [
        'socio_id', 'libro_id', 'ejemplar_id', 'fecha_reserva', 'fecha_deseada', 'fecha_limite', 'estado',
    ];

    protected $casts = [
        'fecha_reserva' => 'date',
        'fecha_deseada' => 'date',
        'fecha_limite' => 'date',
    ];

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    public function libro()
    {
        return $this->belongsTo(Libro::class);
    }

    public function ejemplar()
    {
        return $this->belongsTo(Ejemplar::class);
    }
}
