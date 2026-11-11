<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Multa extends Model
{
    public const METODOS_PAGO = ['efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago'];

    public const MONTO_MAXIMO = 10000;

    protected $fillable = ['socio_id', 'prestamo_id', 'motivo', 'monto', 'monto_pagado', 'fecha', 'estado', 'metodo_pago', 'fecha_pago'];

    protected $casts = [
        // solo la fecha, sin hora
        'fecha' => 'date:Y-m-d',
        'fecha_pago' => 'date:Y-m-d',
        'monto' => 'decimal:2',
        'monto_pagado' => 'decimal:2',
    ];

    protected $appends = ['saldo'];

    public function getSaldoAttribute(): float
    {
        return max(0, round((float) $this->monto - (float) $this->monto_pagado, 2));
    }

    public function socio()
    {
        return $this->belongsTo(Socio::class);
    }

    public function prestamo()
    {
        return $this->belongsTo(Prestamo::class);
    }
}
