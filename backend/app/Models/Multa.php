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

    // la cuenta se hace en centésimos (enteros) para no arrastrar errores de float
    public static function aCentesimos($valor): int
    {
        return (int) round(((float) $valor) * 100);
    }

    public function getSaldoAttribute(): float
    {
        $saldo = self::aCentesimos($this->monto) - self::aCentesimos($this->monto_pagado);

        return max(0, $saldo) / 100;
    }

    protected static function booted(): void
    {
        // red de seguridad: lo pagado nunca puede superar el monto
        static::saving(function (Multa $multa) {
            if (self::aCentesimos($multa->monto_pagado) > self::aCentesimos($multa->monto)) {
                throw new \DomainException('El monto pagado no puede superar el monto de la multa.');
            }
        });
    }

    public function socio()
    {
        return $this->belongsTo(Socio::class)->withTrashed();
    }

    public function prestamo()
    {
        return $this->belongsTo(Prestamo::class);
    }
}
