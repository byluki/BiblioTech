<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prestamo extends Model
{
    protected $fillable = [
        'socio_id', 'ejemplar_id', 'usuario_id', 'fecha_prestamo',
        'fecha_vencimiento', 'fecha_devolucion', 'cantidad_renovaciones', 'estado', 'observaciones',
    ];

    protected $casts = [
        'fecha_prestamo' => 'date',
        'fecha_vencimiento' => 'date',
        'fecha_devolucion' => 'date',
    ];

    public function socio()
    {
        return $this->belongsTo(Socio::class)->withTrashed();
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

    // vence al terminar el día de vencimiento, no a las 00:00
    public function estaVencido(): bool
    {
        return in_array($this->estado, ['activo', 'vencido'], true)
            && $this->fecha_vencimiento !== null
            && $this->fecha_vencimiento->copy()->endOfDay()->isPast();
    }

    // préstamos sin devolver (activo o marcado como vencido)
    public function scopeEnCurso($query)
    {
        return $query->whereIn('estado', ['activo', 'vencido']);
    }

    // sin devolver y con la fecha de vencimiento ya pasada
    public function scopeAtrasados($query)
    {
        return $query->enCurso()->whereDate('fecha_vencimiento', '<', now()->toDateString());
    }
}
