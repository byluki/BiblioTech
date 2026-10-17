<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Socio extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'usuario_id', 'numero_socio', 'foto', 'nombre', 'apellido',
        'cedula', 'direccion', 'telefono', 'email', 'fecha_alta',
        'tipo', 'estado', 'verificado_centro_educativo',
    ];

    protected $casts = [
        'fecha_alta' => 'date',
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

    public function estaActivo(): bool
    {
        return $this->estado === 'activo';
    }

    public function tieneAtrasos(): bool
    {
        return $this->prestamos()->where('estado', 'vencido')->exists();
    }

    // Un socio solo cuenta como "centro educativo" a todos los efectos
    // (por ejemplo, para saltarse el límite de 1 reserva activa) si
    // declaró serlo (tipo = centro_educativo) Y además un bibliotecario o
    // administrador lo verificó a mano (ver SocioController::verificarCentroEducativo).
    // Mientras no esté verificado, opera igual que un socio particular.
    public function esCentroEducativoVerificado(): bool
    {
        return $this->tipo === 'centro_educativo' && $this->verificado_centro_educativo === true;
    }
}
