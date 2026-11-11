<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notificacion extends Model
{
    // la tabla es "notificaciones"
    protected $table = 'notificaciones';

    protected $fillable = ['socio_id', 'titulo', 'mensaje', 'tipo', 'leida', 'fecha_leida'];

    protected $casts = [
        'leida' => 'boolean',
        'fecha_leida' => 'datetime',
    ];

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }
}
