# Guía de instalación y uso de BiblioTech en Ubuntu Server

Esta guía explica cómo dejar BiblioTech funcionando en un servidor con Ubuntu Server 22.04 o 24.04, cómo mantenerlo y cómo se usa cada parte de la web.

Todo corre en contenedores Docker:

| Servicio | Qué es | Puerto |
|---|---|---|
| `frontend` | La página web (HTML, CSS, JS) | 3000 |
| `api` + `app` | La API Laravel (Nginx + PHP-FPM) | 8000 |
| `db` | MySQL 8 | 3306, solo desde el propio servidor |
| `phpmyadmin` | Administrador de la base | 8080, solo desde el propio servidor |

---

## 1. Requisitos

- Ubuntu Server 22.04 o 24.04 con acceso a internet.
- 2 GB de RAM y 10 GB libres de disco como mínimo.
- Un usuario con permisos de `sudo`.
- Saber la IP del servidor: `ip -4 addr show | grep inet`.

## 2. Instalar Docker

```bash
# actualizar el sistema
sudo apt update && sudo apt upgrade -y

# herramientas necesarias
sudo apt install -y ca-certificates curl unzip git

# repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# instalar Docker y el plugin de Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# usar docker sin sudo (hay que cerrar sesión y volver a entrar)
sudo usermod -aG docker $USER
```

Cerrá la sesión SSH, volvé a entrar y comprobá que funciona:

```bash
docker run --rm hello-world
docker compose version
```

## 3. Copiar el proyecto al servidor

Opción A, con Git:

```bash
cd ~
git clone https://github.com/USUARIO/BiblioTech.git
cd BiblioTech
```

Opción B, con el `.zip`. Desde tu computadora:

```bash
scp BiblioTech.zip usuario@IP_DEL_SERVIDOR:~
```

Y en el servidor:

```bash
cd ~
unzip BiblioTech.zip -d BiblioTech
cd BiblioTech
```

## 4. Configurar

### 4.1 Contraseñas de la base de datos (`.env` en la raíz)

```bash
cp .env.example .env
nano .env
```

Poné tu UID y GID (los ves con `id -u` e `id -g`; en el primer usuario suelen ser 1000) y cambiá las contraseñas:

```
UID=1000
GID=1000
DB_DATABASE=biblioteca_barrial
DB_USERNAME=biblioteca
DB_PASSWORD=una-contraseña-larga
DB_ROOT_PASSWORD=otra-contraseña-larga
```

### 4.2 Configuración de Laravel (`backend/.env`)

Si no existe, copialo del ejemplo:

```bash
cp -n backend/.env.example backend/.env
nano backend/.env
```

Para un servidor real cambiá estas líneas:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=http://IP_DEL_SERVIDOR:8000
DB_HOST=db
DB_PASSWORD=la-misma-que-pusiste-en-el-.env-de-la-raiz
CORS_ALLOWED_ORIGINS=http://IP_DEL_SERVIDOR:3000
```

`APP_DEBUG=false` es importante: con `true`, si algo falla, la API muestra rutas internas y detalles del código.

### 4.3 Dirección de la API en el frontend (`frontend/config.js`)

Si dejás `API_URL: ""`, la página usa la misma IP desde la que se abrió, en el puerto 8000. Para un servidor con IP fija eso alcanza y no hay que tocar nada.

Si la API está en otra dirección (por ejemplo con dominio), ponela completa:

```js
window.APP_CONFIG = {
  API_URL: "http://IP_DEL_SERVIDOR:8000/api",
};
```

## 5. Levantar el sistema

```bash
# construir las imágenes y levantar los contenedores
docker compose up -d --build

# instalar las dependencias de PHP (solo si falta la carpeta backend/vendor)
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD/backend":/app -w /app composer:2 install --no-dev --optimize-autoloader

# clave de la aplicación (solo la primera vez)
docker compose exec app php artisan key:generate

# crear las tablas y el usuario administrador
docker compose exec app php artisan migrate --seed --force

# optimizar para producción
docker compose exec app php artisan optimize
```

Comprobá que los 5 contenedores estén en `running`:

```bash
docker compose ps
```

## 6. Abrir el firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp   # página web
sudo ufw allow 8000/tcp   # API
sudo ufw enable
sudo ufw status
```

No abras el 3306 (MySQL) ni el 8080 (phpMyAdmin): solo escuchan dentro del servidor.

## 7. Primer ingreso

1. Abrí `http://IP_DEL_SERVIDOR:3000` en el navegador.
2. Iniciá sesión con el administrador que crea el seeder:
   - Correo: `admin@biblioteca.local`
   - Contraseña: `cambiar123`
3. Cambiá la contraseña enseguida: menú de 3 barras → **Mi cuenta** → Cambiar contraseña. Tiene que tener 8 caracteres o más, una mayúscula, una minúscula y un número.

---

## 8. Cómo se usa la web

### Administrador

**Cargar un libro.** Catálogo → **Agregar libro**.
- Título y autor son obligatorios.
- Con el código de barras / ISBN y **Buscar**, se completan solos los datos y la portada.
- En **Cantidad de copias** van los ejemplares físicos que tiene la biblioteca. Cada copia la puede reservar una persona distinta.
- La **Descripción** se escribe a mano o con **Traer de internet**. Si se deja vacía, la ficha del libro la busca sola.

**Editar o eliminar un libro.** Botón ⋮ sobre la portada. Desde ahí también se cambia la cantidad de copias. Solo se pueden quitar copias que estén en la biblioteca, no las prestadas o reservadas.

**Categorías.** En el formulario del libro, elegí **Otro (nueva categoría)** y escribí el nombre.

### Administrador y bibliotecario

Al iniciar sesión, el inicio muestra la lista de **Reservas** en lugar del buscador:
- Arriba aparecen las que tienen el plazo de retiro vencido, después las que están para retirar (la de plazo más cercano primero) y al final las que esperan una copia.
- Desde ahí se puede entregar el libro (prestar) o cancelar la reserva.
- Debajo sigue el catálogo.

**Contabilidad.**
- **Reservas activas:** se ven agrupadas por socio.
  - **Prestar** entrega el libro reservado.
  - **Cancelar** libera la copia.
  - **Aceptar todas** presta todo lo que reservó una persona.
- **Préstamos y devoluciones:** el historial de préstamos.
  - **Devolver** registra la vuelta del libro. Se puede dejar una observación sobre su estado (por ejemplo, "tapa doblada"), que queda guardada en el préstamo.

**Prestar sin reserva.** En el catálogo, botón **Prestar** de la tarjeta. Se escribe la cédula de quien retira (con o sin puntos y guion) y aparece el nombre del socio para confirmar. Si la cédula no existe o el socio está suspendido, no deja prestar. Al prestar desde una reserva, la cédula ya viene puesta.

**Socios.**
- **Registrar socio:** nombres, apellidos, cédula y correo son obligatorios. El teléfono solo acepta números.
- **Socios registrados:** se ven de a 10 por página. El buscador encuentra por cédula o por nombre.
- Botones de cada socio: editar, cambiar estado (activo / suspendido), eliminar.
- **Centro educativo:** el botón ✓ abre un cartel para confirmar que se vio la credencial. Un centro educativo verificado puede tener varias reservas a la vez; un particular, una sola.

**Multas.**
- **Registrar multa:** socio, motivo y monto, hasta $ 10.000.
- El buscador busca las multas de un socio por nombre o cédula (la búsqueda la hace el servidor) y muestra cuánto debe y cuánto pagó.
- **Registrar pago:** se ingresa el monto que paga y el método. Si paga menos de lo que debe, queda como pago parcial con el saldo pendiente.

**Reportes.** Copias disponibles, prestadas y reservadas, libros más prestados, préstamos atrasados e historial de actividad.

### Socio

**Crear cuenta.** Botón de menú → **Crear cuenta**. Para registrarse hay que aceptar los Términos y Condiciones y la Política de Privacidad. Las cuentas nuevas son de tipo particular.

**Encabezado.** El socio ve el carrito, el botón de sus reservas (🔖) y su foto de usuario. La foto despliega **Mi cuenta**, **Mis libros prestados** y **Cerrar sesión**. La foto se cambia desde **Mi cuenta**.

**Reservar.** Se toca **Agregar** en los libros, se abre el carrito, se elige para cuándo y **Reservar**. Aparece un aviso para pasar a retirar el libro por el local antes de la fecha indicada.

**Multas.** Si el socio debe multas, al entrar ve un aviso con el monto para pasar a pagarlas por el local.

**Ficha de un libro.** Tocando la portada o el título se ve la descripción.

---

## 9. Mantenimiento

### Ver si todo anda y revisar errores

```bash
docker compose ps
docker compose logs -f api          # pedidos a la API
docker compose logs -f app          # PHP
docker compose exec app tail -n 50 storage/logs/laravel.log
```

### Actualizar a una versión nueva

```bash
cd ~/BiblioTech
git pull                            # o reemplazar los archivos con el zip nuevo
docker compose up -d --build
docker compose exec app php artisan migrate --force
docker compose exec app php artisan optimize
```

Después, en el navegador, Ctrl + F5 para que cargue la versión nueva de la página.

### Copia de seguridad de la base

```bash
mkdir -p ~/backups
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" biblioteca_barrial' > ~/backups/biblioteca_$(date +%F).sql
```

Copia automática todos los días a las 3:00 (con `crontab -e`):

```
0 3 * * * cd /home/USUARIO/BiblioTech && docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" biblioteca_barrial' > /home/USUARIO/backups/biblioteca_$(date +\%F).sql
```

Restaurar una copia:

```bash
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" biblioteca_barrial' < ~/backups/biblioteca_2026-11-04.sql
```

### Entrar a phpMyAdmin

phpMyAdmin solo escucha dentro del servidor. Desde tu computadora, abrí un túnel SSH:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@IP_DEL_SERVIDOR
```

Con esa sesión abierta, entrá a `http://localhost:8080`. El usuario es `biblioteca` (o `root`) con las contraseñas del `.env` de la raíz.

### Apagar y prender

```bash
docker compose stop        # apaga sin borrar nada
docker compose start       # vuelve a prender
```

Los contenedores tienen `restart: unless-stopped`: si el servidor se reinicia, arrancan solos.

Nunca uses `docker compose down -v`: el `-v` borra la base de datos.

---

## 10. Problemas comunes

**La página dice "No se pudo conectar con la API".**
- Revisá que el contenedor `bibliotech-api` esté prendido (`docker compose ps`).
- Revisá que el puerto 8000 esté abierto en `ufw`.
- Revisá `API_URL` en `frontend/config.js`.

**Error 500 o "Permission denied" en `storage`.**

```bash
docker compose exec -u root app chown -R www-data:www-data storage bootstrap/cache
docker compose exec -u root app chmod -R 775 storage bootstrap/cache
```

**El contenedor `db` no arranca o se reinicia.** Mirá `docker compose logs db`. Si cambiaste las contraseñas del `.env` después de la primera vez, MySQL sigue usando las viejas: cambiá el `.env` a las originales o, si la base está vacía, borrá el volumen con `docker volume rm bibliotech_db_data` (esto borra todos los datos).

**"port is already allocated".** Otro programa usa ese puerto. Buscalo con `sudo ss -tlnp | grep :3000` y cerralo, o cambiá el puerto de la izquierda en `docker-compose.yml` (por ejemplo `"3001:80"`).

**Cambié algo en `backend/.env` y no se nota.**

```bash
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan optimize
```
