<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Ejemplar;
use App\Models\Libro;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

// Carga 30 libros conocidos con su portada (de Open Library).
// Uso: docker compose exec app php artisan db:seed --class=LibrosFamososSeeder
// Se puede correr más de una vez: los libros que ya existen (mismo título) se saltean.
class LibrosFamososSeeder extends Seeder
{
    private const COPIAS = 3;

    // [título, autor, año, género, título original para buscar la portada]
    private const LIBROS = [
        ['Cien años de soledad', 'Gabriel García Márquez', 1967, 'Novela', 'Cien años de soledad'],
        ['Don Quijote de la Mancha', 'Miguel de Cervantes', 1605, 'Novela', 'Don Quijote'],
        ['Orgullo y prejuicio', 'Jane Austen', 1813, 'Novela', 'Pride and Prejudice'],
        ['Crimen y castigo', 'Fiódor Dostoievski', 1866, 'Novela', 'Crime and Punishment'],
        ['El gran Gatsby', 'F. Scott Fitzgerald', 1925, 'Novela', 'The Great Gatsby'],
        ['Matar a un ruiseñor', 'Harper Lee', 1960, 'Novela', 'To Kill a Mockingbird'],
        ['La metamorfosis', 'Franz Kafka', 1915, 'Novela', 'The Metamorphosis'],

        ['1984', 'George Orwell', 1949, 'Ciencia ficción', 'Nineteen Eighty-Four'],
        ['Un mundo feliz', 'Aldous Huxley', 1932, 'Ciencia ficción', 'Brave New World'],
        ['Fahrenheit 451', 'Ray Bradbury', 1953, 'Ciencia ficción', 'Fahrenheit 451'],
        ['Dune', 'Frank Herbert', 1965, 'Ciencia ficción', 'Dune'],
        ['Fundación', 'Isaac Asimov', 1951, 'Ciencia ficción', 'Foundation'],

        ['El Hobbit', 'J. R. R. Tolkien', 1937, 'Fantasía', 'The Hobbit'],
        ['La Comunidad del Anillo', 'J. R. R. Tolkien', 1954, 'Fantasía', 'The Fellowship of the Ring'],
        ['Harry Potter y la piedra filosofal', 'J. K. Rowling', 1997, 'Fantasía', "Harry Potter and the Philosopher's Stone"],
        ['Juego de tronos', 'George R. R. Martin', 1996, 'Fantasía', 'A Game of Thrones'],
        ['El león, la bruja y el ropero', 'C. S. Lewis', 1950, 'Fantasía', 'The Lion, the Witch and the Wardrobe'],

        ['Y no quedó ninguno', 'Agatha Christie', 1939, 'Policial', 'And Then There Were None'],
        ['El nombre de la rosa', 'Umberto Eco', 1980, 'Policial', 'The Name of the Rose'],
        ['Estudio en escarlata', 'Arthur Conan Doyle', 1887, 'Policial', 'A Study in Scarlet'],
        ['Los hombres que no amaban a las mujeres', 'Stieg Larsson', 2005, 'Policial', 'The Girl with the Dragon Tattoo'],
        ['El código Da Vinci', 'Dan Brown', 2003, 'Policial', 'The Da Vinci Code'],

        ['Drácula', 'Bram Stoker', 1897, 'Terror', 'Dracula'],
        ['Frankenstein', 'Mary Shelley', 1818, 'Terror', 'Frankenstein'],
        ['It', 'Stephen King', 1986, 'Terror', 'It'],

        ['El principito', 'Antoine de Saint-Exupéry', 1943, 'Infantil', 'The Little Prince'],
        ['Alicia en el país de las maravillas', 'Lewis Carroll', 1865, 'Infantil', "Alice's Adventures in Wonderland"],
        ['Los juegos del hambre', 'Suzanne Collins', 2008, 'Juvenil', 'The Hunger Games'],

        ['Sapiens: De animales a dioses', 'Yuval Noah Harari', 2011, 'Ensayo', 'Sapiens'],
        ['El diario de Ana Frank', 'Ana Frank', 1947, 'Biografía', 'The Diary of a Young Girl'],
    ];

    public function run(): void
    {
        $nuevos = 0;

        foreach (self::LIBROS as [$titulo, $autor, $anio, $genero, $original]) {
            if (Libro::where('titulo', $titulo)->exists()) {
                $this->command?->line("  ya estaba: {$titulo}");
                continue;
            }

            $categoria = Categoria::firstOrCreate(['nombre' => $genero]);

            $libro = Libro::create([
                'titulo' => $titulo,
                'autor' => $autor,
                'anio_edicion' => $anio,
                'categoria_id' => $categoria->id,
                'foto_portada' => $this->buscarPortada($original, $autor),
            ]);

            for ($i = 0; $i < self::COPIAS; $i++) {
                Ejemplar::create([
                    'codigo_interno' => 'EJ-'.$libro->id.'-'.strtoupper(Str::random(6)),
                    'libro_id' => $libro->id,
                    'estado' => 'disponible',
                ]);
            }

            $nuevos++;
            $this->command?->info("  + {$titulo}".($libro->foto_portada ? '' : ' (sin portada)'));
        }

        $this->command?->info("Listo: {$nuevos} libros nuevos, ".self::COPIAS.' copias cada uno.');
    }

    // busca la portada en Open Library por título y autor; si no hay, queda sin portada
    private function buscarPortada(string $titulo, string $autor): ?string
    {
        try {
            $resp = Http::timeout(10)->get('https://openlibrary.org/search.json', [
                'title' => $titulo,
                'author' => $autor,
                'fields' => 'cover_i',
                'limit' => 5,
            ]);

            foreach ($resp->json('docs', []) as $doc) {
                if (! empty($doc['cover_i'])) {
                    return 'https://covers.openlibrary.org/b/id/'.$doc['cover_i'].'-L.jpg';
                }
            }
        } catch (\Throwable $e) {
            // sin internet o Open Library caído: se sigue sin portada
        }

        return null;
    }
}
