# API Laravel sobre PHP-FPM

# Etapa 1: dependencias con Composer
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# Etapa 2: imagen final
FROM php:8.4-fpm-alpine

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

RUN { echo 'opcache.enable=1'; echo 'opcache.memory_consumption=128'; echo 'opcache.validate_timestamps=1'; echo 'opcache.revalidate_freq=2'; } > /usr/local/etc/php/conf.d/opcache.ini

# www-data con el mismo UID/GID que el usuario del sistema
ARG UID=1000
ARG GID=1000
RUN deluser www-data 2>/dev/null || true \
    && delgroup www-data 2>/dev/null || true \
    && addgroup -g ${GID} www-data \
    && adduser -D -u ${UID} -G www-data -h /var/www www-data

WORKDIR /var/www

COPY --from=vendor /app/vendor ./vendor
COPY . .

RUN cp -n .env.example .env 2>/dev/null || true \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public bootstrap/cache \
    && chown -R www-data:www-data /var/www \
    && chmod -R 775 storage bootstrap/cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
