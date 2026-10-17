<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notificacion extends Model
{
    // Sin esto, Eloquent adivina "notificacions" a partir de la clase
    // (regla en inglés), pero la migración creó la tabla como
    // "notificaciones" (create_notificaciones_table).
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
