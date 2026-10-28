<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Multa extends Model
{
    public const METODOS_PAGO = ['efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago'];

    protected $fillable = ['socio_id', 'prestamo_id', 'motivo', 'monto', 'fecha', 'estado', 'metodo_pago', 'fecha_pago'];

    protected $casts = [
        // sin hora ni zona horaria: así el frontend no la corre un día
        'fecha' => 'date:Y-m-d',
        'fecha_pago' => 'date:Y-m-d',
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
