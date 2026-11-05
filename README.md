<div align="center">

<img src="frontend/images/logo.png" alt="Logo BiblioTech" width="90" height="90">

# BiblioTech

Sistema web de la Biblioteca Central de San José: catálogo, reservas, préstamos, multas y reportes.

</div>

## Qué hace

| Módulo | Descripción |
|---|---|
| Catálogo | Libros con portada, ISBN, descripción y cantidad de copias. Se puede consultar sin iniciar sesión. |
| Reservas | El socio reserva desde el carrito y retira el libro en el local. Cada copia la puede reservar una persona distinta. |
| Préstamos | Préstamo, devolución con observación, renovación y anulación. |
| Socios | Alta, edición, búsqueda por cédula, verificación de centro educativo. |
| Multas | Registro (hasta $ 10.000), pagos totales o parciales con método de pago. |
| Reportes | Copias disponibles, libros más prestados, préstamos atrasados, historial. |

## Roles

| Rol | Puede |
|---|---|
| Invitado | Ver el catálogo. |
| Socio | Reservar, cancelar sus reservas, ver sus préstamos y sus multas. |
| Bibliotecario | Socios, préstamos, devoluciones, multas, reservas y reportes. |
| Administrador | Todo lo anterior y el catálogo (libros, copias y categorías). |

## Tecnologías

- Backend: Laravel 12, PHP 8.4, Laravel Sanctum (tokens)
- Base de datos: MySQL 8
- Frontend: HTML, CSS y JavaScript, Bootstrap 5
- Infraestructura: Docker Compose

## Estructura

```
BiblioTech/
├── backend/                 API REST (Laravel)
│   ├── app/                 controladores, middleware y modelos
│   ├── database/            migraciones y seeders
│   ├── routes/api.php       rutas de la API
│   └── docker/nginx/        configuración de Nginx de la API
├── frontend/                página web (index.html, style.css, script.js)
│   └── config.js            dirección de la API
├── docker-compose.yml
└── GUIA_INSTALACION_UBUNTU.md
```

📖[Guia de instalacion en Ubuntu Server](GUIA_INSTALACION_UBUNTU.md)

- Web: http://localhost:3000
- API: http://localhost:8000/api
- phpMyAdmin: http://localhost:8080

Usuario administrador inicial: `admin@biblioteca.local` / `cambiar123`. Hay que cambiar la contraseña al entrar.

La instalación en un servidor, el mantenimiento (copias de seguridad, actualizaciones) y el uso de cada parte de la web están en **[GUIA_INSTALACION_UBUNTU.md](GUIA_INSTALACION_UBUNTU.md)**.

## API

Todas las rutas están bajo `/api`. La autenticación es con token: `POST /api/auth/login` devuelve un token que se manda en el encabezado `Authorization: Bearer <token>`.

- Públicas: `POST /auth/login`, `POST /auth/registro`, `GET /libros`, `GET /categorias`, `GET /ejemplares`.
- Socio: `/auth/me`, `/auth/perfil`, `/reservas`, `/mis-multas`, `/notificaciones`.
- Gestión (bibliotecario o administrador): `/socios`, `/prestamos`, `/multas`, `/multas/{id}/pago`, `/reportes/*`.
- Solo administrador: `/libros` (alta, edición, baja y `/libros/{id}/cantidad`), `/categorias`, `/usuarios`, `/bibliotecarios`.

---

<div align="center"><sub>Proyecto académico, Biblioteca Central de San José</sub></div>
