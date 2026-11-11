<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Socio extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'usuario_id', 'numero_socio', 'foto', 'nombre', 'apellido',
        'cedula', 'direccion', 'telefono', 'email', 'fecha_alta', 'valido_hasta',
        'tipo', 'estado', 'verificado_centro_educativo',
    ];

    protected $appends = ['cedula_pendiente'];

    public function getCedulaPendienteAttribute(): bool
    {
        return $this->cedulaPendiente();
    }

    protected $casts = [
        'fecha_alta' => 'date',
        'valido_hasta' => 'date',
        'verificado_centro_educativo' => 'boolean',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }

    public function prestamos()
    {
        return $this->hasMany(Prestamo::class);
    }

    public function reservas()
    {
        return $this->hasMany(Reserva::class);
    }

    public function multas()
    {
        return $this->hasMany(Multa::class);
    }

    public function notificaciones()
    {
        return $this->hasMany(Notificacion::class);
    }

    // la cédula todavía no se cargó
    public function cedulaPendiente(): bool
    {
        return str_starts_with((string) $this->cedula, 'PENDIENTE-');
    }

    public function carnetVigente(): bool
    {
        return $this->valido_hasta === null || $this->valido_hasta->endOfDay()->isFuture();
    }

    public function estaActivo(): bool
    {
        return $this->estado === 'activo';
    }

    public function tieneAtrasos(): bool
    {
        return $this->prestamos()->where('estado', 'vencido')->exists();
    }

    // centro educativo = tipo centro_educativo y verificado por un bibliotecario
    public function esCentroEducativoVerificado(): bool
    {
        return $this->tipo === 'centro_educativo' && $this->verificado_centro_educativo === true;
    }
}
