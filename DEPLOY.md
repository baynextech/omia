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

Variables nuevas a definir (detalle en `.env.example`):

| Variable | Para qué |
|---|---|
| `API_URL=https://api.omia.site` | Webhook de Mercado Pago |
| `MERCADOPAGO_ACCESS_TOKEN` | Credenciales de **producción** de la aplicación. Sin esto los pagos quedan deshabilitados y el sitio lo avisa |
| `MERCADOPAGO_WEBHOOK_SECRET` | Firma del webhook (recomendada) |
| `ADMIN_PASSWORD` | Solo si todavía no existe el usuario admin (mínimo 10 caracteres) |
| `GOOGLE_CLIENT_ID` | Botón "Continuar con Google". Sin esto el botón no aparece |
| `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL` | Mails de bienvenida, cobros, recuperación de contraseña y avisos al equipo |
| `SITE_URL=https://omia.site` | Sitemap |

En Mercado Pago Developers → Webhooks, la URL `https://api.omia.site/api/webhooks/mercadopago` tiene que recibir los eventos **Pagos** y **Planes y suscripciones**.

## 2. Base de datos

```bash
npm run db:migrate     # corre migrations/*.sql en orden (001 y 002)
```

Las migraciones solo agregan columnas, tablas e índices. Se pueden correr más de una vez.
La 002 suma suscripciones, recuperación de contraseña, login con Google, noticias, mensajes de contacto y datos de envío de pedidos. La 003 suma las tablas del contenido editable del sitio (`site_content` y `media`).

**Contenido editable:** todo el texto, las imágenes, el contacto, los planes, las preguntas frecuentes, el SEO y los textos legales se cambian desde `/admin → Sitio` y se ven al instante. Los títulos y descripciones que se muestran al compartir un enlace por WhatsApp o Instagram se actualizan al próximo build (`npm run build`).

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
# La API tiene que estar arriba: el build lee las fichas y notas publicadas para armar
# sitemap.xml y una página con etiquetas propias por cada profesor, instituto y nota.
# Cargar antes los VITE_* de .env.example (CUIT, mail, WhatsApp, Google Analytics, Meta Pixel).
VITE_API_URL=https://api.omia.site npm run build
rsync -av --delete --exclude 'server.cjs*' dist/ <usuario>@<host>:<carpeta public_html de omia.site>/
```

Después, limpiar la caché del CDN en el panel del hosting; si no, se sigue viendo el sitio viejo.

## 5. Verificación

1. `https://omia.site` carga y el menú muestra **Ranking**.
2. Registrar una cuenta de prueba e ingresar.
3. Ingresar como admin y abrir `/admin`.
4. Con credenciales de prueba de Mercado Pago: crear una ficha, abonar un plan y confirmar que aparece en el directorio.
5. Suscribirse con una cuenta compradora de prueba y verificar que el plan queda activo, que llega el mail y que aparece en `/admin → Suscripciones`.
6. Darse de baja desde el panel y confirmar que Mercado Pago muestra la suscripción cancelada.
7. Probar `https://omia.site/sitemap.xml`, `/robots.txt` y compartir un perfil por WhatsApp para ver la vista previa.
8. Alta en Google Search Console (propiedad `omia.site`) y envío del sitemap.
9. Con la API local o de prueba: `npm run test:api` (ver "Desarrollo local").

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
API=http://localhost:4100 npm run test:api               # pruebas de punta a punta (suscripción, baja, mails, formularios)
```

Sin `MERCADOPAGO_ACCESS_TOKEN` y fuera de producción, los pagos usan un simulador.

## Deploy en el VPS de Hostinger (estado real al 11/10/2026)

La API corre en el VPS `srv1885334` como proyecto Docker **`omia`** (hPanel → VPS → Docker manager): contenedores `omia-api` (Node 22, código en `/app`, arranca `dist/server.cjs`) y `omia-db` (PostgreSQL 16, red propia `omia-net`). La base no soporta SSL (`DATABASE_SSL` queda sin definir).

El «Terminal» de hPanel abre la consola del **servidor** (`root@srv1885334`), no la de un contenedor: los comandos se dirigen al contenedor de Omia con `docker exec <nombre>`. Usar solo los contenedores `omia-db` y `omia-api` (el servidor lo comparten otros proyectos).

1. **Respaldo**:
   ```sh
   docker exec omia-db pg_dump -U omia_user omia > ~/omia-respaldo-$(date +%F).sql && ls -la ~/omia-respaldo-*.sql
   ```
2. **Deploy**:
   ```sh
   docker exec omia-api sh -c 'wget -qO /tmp/deploy-api.sh https://raw.githubusercontent.com/baynextech/omia/main/scripts/deploy-api.sh && sh /tmp/deploy-api.sh'
   ```
3. **Reiniciar** y verificar `https://api.omia.site/api/plans` (debe devolver los tres planes):
   ```sh
   docker restart omia-api
   ```
4. **Sitio** — compilar con `VITE_API_URL=https://api.omia.site npm run build` y subir el contenido de `dist/` (sin `server.cjs*`) a `public_html` de omia.site desde el administrador de archivos de hPanel.

Variables del proyecto que conviene corregir cuando haya acceso: `MERCADOPAGO_ACCESS_TOKEN` (vencido), `ADMIN_PASSWORD` (clave compartida) y `GEMINI_API_KEY`. Además, el modelo `gemini-2.0-flash` ya no existe (el código nuevo usa `gemini-3.8-flash`).

## Publicar un cambio del sitio: subir SIEMPRE los dos archivos
Tras `VITE_API_URL=https://api.omia.site npm run build`, subir **`assets/app.js` y `assets/index.css`** juntos. Los estilos nuevos (por ejemplo una medida de espaciado que antes no se usaba) solo existen en `index.css`: si se sube solo `app.js`, el cambio de diseño no se ve. Después comparar lo publicado con lo compilado:
```bash
cmp <(curl -s https://omia.site/assets/app.js) dist/assets/app.js && cmp <(curl -s https://omia.site/assets/index.css) dist/assets/index.css && echo OK
```
Si cambió el SEO, las páginas o `.htaccess`, subir también `index.html`, `robots.txt`, `sitemap.xml` y el `index.html` de cada carpeta de página.
