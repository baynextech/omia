# Deploy de Omia

Omia tiene dos partes que se publican **juntas** (el sitio y la API cambian de formato a la vez):

| Parte | Dónde vive | Qué se sube |
|-------|------------|-------------|
| Sitio | `omia.site` (hosting estático) | El contenido de `dist/` sin `server.cjs*` |
| API | `api.omia.site` (Node + PostgreSQL) | El repo, compilado a `dist/server.cjs` |

## 1. Antes de empezar

En el servidor de la API, con las variables de Omia cargadas:

```bash
# Respaldo de la base (obligatorio antes de migrar)
pg_dump "$DATABASE_URL" -Fc -f ~/omia-antes-de-001-$(date +%F).dump
```

Revisar el archivo de variables de la API contra `.env.example`. **El servidor nuevo no arranca en producción si:**

- falta `DATABASE_URL`, o
- `JWT_SECRET` tiene menos de 32 caracteres (generar con `openssl rand -hex 32`).

Cambiar `JWT_SECRET` cierra todas las sesiones abiertas; los usuarios vuelven a ingresar.

Variables nuevas a definir: `API_URL=https://api.omia.site`, `MERCADOPAGO_WEBHOOK_SECRET` (opcional) y `ADMIN_PASSWORD` (solo si todavía no existe el usuario admin; mínimo 10 caracteres). Sin `MERCADOPAGO_ACCESS_TOKEN` los pagos quedan deshabilitados y el sitio lo avisa.

## 2. Base de datos

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_alta_pagos_ranking.sql
```

La migración solo agrega columnas, tablas e índices. Se puede correr más de una vez.

Si ya existe más de una ficha con el mismo `user_id`, el índice único falla: resolver los duplicados y volver a correrla.

## 3. API

```bash
git fetch origin && git checkout main && git pull
npm ci
npm run build          # genera dist/server.cjs
# reiniciar el proceso de la API (pm2, systemd o docker, según cómo esté montada)
curl -s https://api.omia.site/api/health
curl -s https://api.omia.site/api/plans     # debe devolver los tres planes
```

## 4. Sitio

En la máquina local:

```bash
VITE_API_URL=https://api.omia.site npm run build
rsync -av --delete --exclude 'server.cjs*' dist/ <usuario>@<host>:<carpeta public_html de omia.site>/
```

Después, limpiar la caché del CDN en el panel del hosting; si no, se sigue viendo el sitio viejo.

## 5. Verificación

1. `https://omia.site` carga y el menú muestra **Ranking**.
2. Registrar una cuenta de prueba e ingresar.
3. Ingresar como admin y abrir `/admin`.
4. Con credenciales de prueba de Mercado Pago: crear una ficha, abonar un plan y confirmar que aparece en el directorio.
5. En Mercado Pago Developers → Webhooks, configurar `https://api.omia.site/api/webhooks/mercadopago` para el evento **Pagos**.

## 6. Vuelta atrás

- API: `git checkout <commit anterior> && npm ci && npm run build` y reiniciar. Las columnas nuevas no molestan al código viejo.
- Sitio: volver a subir el `dist/` anterior.
- Base: solo si hiciera falta, `pg_restore --clean -d "$DATABASE_URL" ~/omia-antes-de-001-<fecha>.dump`.

## Desarrollo local

```bash
# Base propia (no usar puertos de otros proyectos)
createdb omia_dev && psql omia_dev -f schema-vps.sql && psql omia_dev -f migrations/001_alta_pagos_ranking.sql
psql omia_dev -f seeds/demo-products.sql            # productos de ejemplo (opcional)

DATABASE_URL=postgres://localhost/omia_dev PORT=4100 APP_URL=http://localhost:5199 ADMIN_PASSWORD=<clave-local> npm run dev
VITE_API_URL=http://localhost:4100 npm run dev:web -- --port 5199

API=http://localhost:4100 node scripts/seed-prueba.mjs   # profesor y alumno de prueba
```

Sin `MERCADOPAGO_ACCESS_TOKEN` y fuera de producción, los pagos usan un simulador.
