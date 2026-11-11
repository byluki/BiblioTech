<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistorialActividad extends Model
{
    public $timestamps = true;

    protected $table = 'historial_actividad';

    protected $fillable = ['usuario_id', 'accion', 'entidad', 'entidad_id', 'detalle', 'fecha'];

    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }

    public static function registrar(?int $usuarioId, string $accion, string $entidad, ?int $entidadId, ?string $detalle = null): self
    {
        return self::create([
            'usuario_id' => $usuarioId,
            'accion' => $accion,
            'entidad' => $entidad,
            'entidad_id' => $entidadId,
            'detalle' => $detalle,
            'fecha' => now(),
        ]);
    }
}
