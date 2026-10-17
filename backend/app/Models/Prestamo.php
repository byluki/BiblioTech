<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prestamo extends Model
{
    protected $fillable = [
        'socio_id', 'ejemplar_id', 'usuario_id', 'fecha_prestamo',
        'fecha_vencimiento', 'fecha_devolucion', 'cantidad_renovaciones', 'estado',
    ];

    protected $casts = [
        'fecha_prestamo' => 'date',
        'fecha_vencimiento' => 'date',
        'fecha_devolucion' => 'date',
    ];

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    public function ejemplar()
    {
        return $this->belongsTo(Ejemplar::class);
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }

    public function multas()
    {
        return $this->hasMany(Multa::class);
    }

    public function estaVencido(): bool
    {
        return $this->estado === 'activo' && $this->fecha_vencimiento->isPast();
    }
}
