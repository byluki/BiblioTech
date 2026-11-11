#!/usr/bin/env bash
# =============================================================================
# completar-laravel.sh
#
# Tu proyecto tiene app/, database/, routes/api.php, bootstrap/app.php y
# config/cors.php (o sea, ya empezaste un Laravel 12), pero le faltan los
# archivos base que genera "composer create-project laravel/laravel":
#   - composer.json / composer.lock
#   - artisan
#   - public/index.php (+ resto de public/)
#   - bootstrap/providers.php
#   - config/*.php base (app, auth, database, session, cache, etc.)
#   - routes/web.php, routes/console.php
#   - resources/ (views, css, js)
#
# Este script genera un Laravel 12 nuevo en una carpeta temporal usando el
# contenedor oficial de Composer (no requiere PHP/Composer instalado en tu
# máquina), y copia SOLO los archivos que te faltan, sin tocar los tuyos.
#
# Uso:
#   chmod +x completar-laravel.sh
#   ./completar-laravel.sh
# =============================================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"

echo "==> Generando Laravel 12 base en $TMP_DIR (via Docker, sin instalar nada local)"
docker run --rm --user "$(id -u):$(id -g)" -e COMPOSER_HOME=/tmp/composer-home \
  -v "$TMP_DIR":/app -w /app composer:2 \
  create-project laravel/laravel base "12.*" --prefer-dist --no-interaction

echo "==> Instalando Laravel Sanctum (ya lo usa tu bootstrap/app.php)"
docker run --rm --user "$(id -u):$(id -g)" -e COMPOSER_HOME=/tmp/composer-home \
  -v "$TMP_DIR/base":/app -w /app composer:2 \
  require laravel/sanctum --no-interaction

echo "==> Copiando SOLO lo que te falta (no se pisa nada tuyo)"
cp -n "$TMP_DIR/base/composer.json" "$PROJECT_DIR/composer.json" 2>/dev/null || true
cp -n "$TMP_DIR/base/composer.lock" "$PROJECT_DIR/composer.lock" 2>/dev/null || true
cp -n "$TMP_DIR/base/artisan" "$PROJECT_DIR/artisan"
cp -rn "$TMP_DIR/base/public" "$PROJECT_DIR/public"
cp -n "$TMP_DIR/base/bootstrap/providers.php" "$PROJECT_DIR/bootstrap/providers.php" 2>/dev/null || true
mkdir -p "$PROJECT_DIR/bootstrap/cache" && touch "$PROJECT_DIR/bootstrap/cache/.gitkeep"
cp -rn "$TMP_DIR/base/resources" "$PROJECT_DIR/resources" 2>/dev/null || true
cp -n "$TMP_DIR/base/routes/web.php" "$PROJECT_DIR/routes/web.php" 2>/dev/null || true
cp -n "$TMP_DIR/base/routes/console.php" "$PROJECT_DIR/routes/console.php" 2>/dev/null || true

# storage/ es obligatoria para Laravel (logs, cache, sesiones, archivos subidos)
# y no vos no la tenías, así que la copiamos completa si no existe.
if [ ! -d "$PROJECT_DIR/storage" ]; then
  cp -r "$TMP_DIR/base/storage" "$PROJECT_DIR/storage"
fi

# Config: copiamos cada archivo base solo si vos no tenés ya uno con ese nombre
for f in "$TMP_DIR"/base/config/*.php; do
  name="$(basename "$f")"
  if [ ! -f "$PROJECT_DIR/config/$name" ]; then
    cp "$f" "$PROJECT_DIR/config/$name"
  fi
done

rm -rf "$TMP_DIR"

echo ""
echo "==> Listo. Revisá que quedó:"
echo "    - composer.json, artisan, public/index.php"
echo "    - config/app.php, config/auth.php, config/database.php, config/sanctum.php, etc."
echo "    - routes/web.php, routes/console.php"
echo ""
echo "Tu app/, database/migrations, routes/api.php, bootstrap/app.php y config/cors.php quedaron intactos."
echo "Ahora sí podés construir la imagen Docker (ver Dockerfile / docker-compose.yml)."
