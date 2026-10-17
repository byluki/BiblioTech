# =============================================================================
# Dockerfile - BiblioTech (Laravel API)
# =============================================================================

# ---- Etapa 1: instalar dependencias PHP con Composer -----------------------
FROM composer:2 AS vendor
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# ---- Etapa 2: imagen final PHP-FPM ------------------------------------------
FROM php:8.4-fpm-alpine

# Extensiones que Laravel + MySQL necesitan
RUN apk add --no-cache \
        libzip-dev \
        libpng-dev \
        oniguruma-dev \
        icu-dev \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        zip \
        bcmath \
        intl \
        opcache

# OPcache activado: PHP no recompila los archivos en cada petición
RUN { echo 'opcache.enable=1'; echo 'opcache.memory_consumption=128'; echo 'opcache.validate_timestamps=1'; echo 'opcache.revalidate_freq=2'; } > /usr/local/etc/php/conf.d/opcache.ini

# Usuario no-root con el mismo UID/GID que tu usuario de host (WSL/Linux),
# para que los archivos creados dentro del contenedor te pertenezcan a vos
# y no a root. Por defecto usa 1000:1000 (el UID/GID más común en WSL).
ARG UID=1000
ARG GID=1000
RUN deluser www-data 2>/dev/null || true \
    && delgroup www-data 2>/dev/null || true \
    && addgroup -g ${GID} www-data \
    && adduser -D -u ${UID} -G www-data -h /var/www www-data

WORKDIR /var/www

COPY --from=vendor /app/vendor ./vendor
COPY . .

RUN cp .env.example .env 2>/dev/null || true \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public bootstrap/cache \
    && chown -R www-data:www-data /var/www \
    && chmod -R 775 storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
