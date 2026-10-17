<div align="center">

<img src="public/images/logo.png" alt="Logo BiblioTech" width="90" height="90">

# 📚 BiblioTech

**Sistema de gestión para bibliotecas barriales**  
Catálogo, préstamos, reservas, multas y reportes — todo en un solo lugar.

![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.2%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Sanctum](https://img.shields.io/badge/Auth-Sanctum-3178C6?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## 📖 Sobre el proyecto

**BiblioTech** es una API REST construida con **Laravel 12** para administrar una biblioteca barrial, con un frontend liviano en HTML/CSS/JS (Bootstrap 5) que consume esa API. Contempla tres roles de usuario (**administrador**, **bibliotecario** y **socio**) y cubre todo el ciclo de vida de una biblioteca: alta de libros y ejemplares, préstamos, devoluciones, reservas, multas por atraso y reportes de uso.

## ✨ Funcionalidades principales

| Módulo | Descripción |
|---|---|
| 📕 **Catálogo** | Alta, edición y baja de libros y categorías, con portada e ISBN. Consultable sin necesidad de iniciar sesión. |
| 🔖 **Ejemplares** | Cada libro puede tener varios ejemplares físicos, con estado propio (disponible, prestado, etc.). |
| 🔄 **Préstamos** | Registro, devolución, renovación y anulación de préstamos. |
| ⏰ **Reservas** | Un socio reserva un ejemplar y el bibliotecario confirma la entrega. |
| 💸 **Multas** | Gestión de sanciones por atrasos en la devolución. |
| 🔔 **Notificaciones** | Avisos a los socios sobre el estado de sus préstamos/reservas. |
| 🧑‍🤝‍🧑 **Socios y personal** | Administración de socios, bibliotecarios y usuarios del sistema, con verificación de centro educativo. |
| 📊 **Reportes** | Préstamos por período, libros más prestados, socios con atrasos y disponibilidad del catálogo. |

## 🔐 Roles y permisos

| Rol | Puede... |
|---|---|
| **Invitado** | Consultar el catálogo (libros, categorías, ejemplares) sin iniciar sesión. |
| **Socio** | Además de lo anterior: reservar/cancelar sus propias reservas y ver sus notificaciones. |
| **Bibliotecario** | Gestionar socios, ejemplares, préstamos, multas, confirmar reservas y ver reportes. |
| **Administrador** | Todo lo anterior + gestión del catálogo (libros/categorías) y de cuentas de usuario/bibliotecarios. |

## 🛠️ Stack técnico

- **Backend:** Laravel 12 · PHP 8.2+ · Laravel Sanctum (autenticación por token)
- **Base de datos:** MySQL 8.0
- **Frontend:** HTML + CSS + JavaScript (vanilla) · Bootstrap 5 · Font Awesome
- **Infraestructura:** Docker Compose (app + Nginx + MySQL + phpMyAdmin)

## 📂 Estructura del proyecto

```
BiblioTech/
├── backend/                    # API REST (Laravel 12)
│   ├── app/                    # Controladores (Http/Controllers/Api), Middleware, Models
│   ├── database/               # Migraciones y seeders
│   ├── routes/api.php          # Rutas públicas, de socio y de gestión
│   ├── docker/nginx/           # Nginx del backend
│   ├── Dockerfile
│   └── .env.example
├── frontend/                   # Cliente estático (HTML + CSS + JS, Bootstrap 5)
│   ├── index.html · style.css · script.js
│   ├── config.js               # URL de la API (APP_CONFIG.API_URL)
│   ├── nginx.conf · Dockerfile
│   └── images/
├── Documentacion/
└── docker-compose.yml          # frontend + api + app (PHP-FPM) + MySQL + phpMyAdmin
```

## 🚀 Puesta en marcha

### Opción A — Con Docker (recomendada)

```bash
cp .env.example .env                              # UID/GID para permisos (opcional)
cp backend/.env.docker.example backend/.env
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

- 🖥️ Frontend: **http://localhost:3000**
- 🔌 API: **http://localhost:8000/api**
- 🗄️ phpMyAdmin: **http://localhost:8080**

### Opción B — Sin Docker

Backend:

```bash
cd backend
composer install
cp .env.example .env      # completar datos de conexión a tu MySQL local
php artisan key:generate
php artisan migrate --seed
php artisan serve         # http://localhost:8000
```

Frontend (cualquier servidor estático):

```bash
cd frontend
python3 -m http.server 3000   # http://localhost:3000
```

### 👤 Usuario administrador inicial

El seeder crea automáticamente los tres roles y una cuenta de administrador:

| Campo | Valor |
|---|---|
| Email | `admin@biblioteca.local` |
| Contraseña | `cambiar123` |

> ⚠️ Cambiá esta contraseña apenas tengas el sistema en marcha.

## 🔌 API

Las rutas viven bajo `/api`. Un resumen de los grupos principales:

- **Públicas:** `POST /api/auth/login`, `POST /api/auth/registro`, `GET /api/libros`, `GET /api/categorias`, `GET /api/ejemplares`.
- **Autenticadas (socio):** `/api/auth/me`, `/api/reservas`, `/api/notificaciones`.
- **Gestión (bibliotecario/administrador):** `/api/socios`, `/api/prestamos`, `/api/multas`, `/api/ejemplares` (alta/edición), confirmación de reservas, `/api/reportes/*`.
- **Solo administrador:** alta/edición/baja de `/api/libros`, `/api/categorias`, `/api/usuarios` y `/api/bibliotecarios`.

La autenticación se maneja con **Laravel Sanctum** vía token: iniciá sesión en `/api/auth/login` y enviá el token recibido en el header `Authorization: Bearer <token>` en las siguientes peticiones.

## 🖥️ Frontend

El frontend en `frontend/` es una página estática independiente que consume la API. La URL del backend se define en `frontend/config.js` (`APP_CONFIG.API_URL`). Si se deja vacía, usa el mismo host desde el que se abrió la página con el puerto `8000`, así que funciona en `localhost` y desde otros dispositivos de la red sin tocar código. Para producción, por ejemplo: `API_URL: "https://api.miapp.com/api"`.

En el backend, la variable `CORS_ALLOWED_ORIGINS` (en `backend/.env`) permite restringir qué origen(es) pueden llamar a la API.

---

<div align="center">
<sub>Proyecto académico — Biblioteca Barrial</sub>
</div>
