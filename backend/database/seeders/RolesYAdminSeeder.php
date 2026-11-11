<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolesYAdminSeeder extends Seeder
{
    public function run(): void
    {
        $administrador = Rol::firstOrCreate(['nombre' => 'administrador']);
        Rol::firstOrCreate(['nombre' => 'bibliotecario']);
        Rol::firstOrCreate(['nombre' => 'socio']);

        Usuario::firstOrCreate(
            ['email' => 'admin@biblioteca.local'],
            [
                'nombre' => 'Administrador',
                'password' => Hash::make('cambiar123'),
                'rol_id' => $administrador->id,
                'activo' => true,
            ]
        );
    }
}
