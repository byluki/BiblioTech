<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Multa extends Model
{
    protected $fillable = ['socio_id', 'prestamo_id', 'motivo', 'monto', 'fecha', 'estado'];

    protected $casts = [
        'fecha' => 'date',
        'monto' => 'decimal:2',
    ];

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    public function prestamo()
    {
        return $this->belongsTo(Prestamo::class);
    }
}
