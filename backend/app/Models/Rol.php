<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rol extends Model
{
    // Sin esto, Eloquent adivina el nombre de tabla en inglés a partir de
    // la clase ("Rol" -> "rols"), pero la migración creó la tabla como
    // "roles" (create_roles_table). Sin esta línea, tanto el login como
    // el registro fallan con "Table 'rols' doesn't exist".
    protected $table = 'roles';

    protected $fillable = ['nombre'];

    public function usuarios()
    {
        return $this->hasMany(Usuario::class);
    }
}
