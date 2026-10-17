<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = ['nombre', 'email', 'password', 'rol_id', 'activo'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function rol()
    {
        return $this->belongsTo(Rol::class);
    }

    public function socio()
    {
        return $this->hasOne(Socio::class);
    }

    public function bibliotecario()
    {
        return $this->hasOne(Bibliotecario::class);
    }

    public function esAdministrador(): bool
    {
        return $this->rol?->nombre === 'administrador';
    }

    public function esBibliotecario(): bool
    {
        return $this->rol?->nombre === 'bibliotecario';
    }

    public function esSocio(): bool
    {
        return $this->rol?->nombre === 'socio';
    }
}
