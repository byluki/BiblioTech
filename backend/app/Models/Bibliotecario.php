<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bibliotecario extends Model
{
    protected $fillable = ['usuario_id', 'nombre', 'apellido', 'cedula', 'telefono', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class);
    }
}
