# Omia — directorio de yoga y pilates

Plataforma que conecta alumnos con profesores e institutos de yoga y pilates de Argentina. Los profesionales publican su ficha con un plan mensual (débito automático por Mercado Pago) y cobran sus clases directo, sin comisión. Incluye tienda, noticias, ranking con reseñas, asistente virtual con IA y un panel de administración donde se edita casi todo el sitio.

- **Sitio:** https://omia.site (hosting estático de Hostinger)
- **API:** https://api.omia.site (Node + PostgreSQL en un VPS de Hostinger, Docker)
- **Documentación:** [`docs/`](docs) · [Deploy](DEPLOY.md) · [Guía del panel](docs/GUIA-ADMIN.md) · [Arquitectura](docs/ARQUITECTURA.md) · [Pendientes](docs/PENDIENTES.md) · [Manual de marca (PDF)](docs/manual-de-marca/Omia-Manual-de-Marca.pdf)

## Stack
React 19 + Vite + Tailwind (sitio) · Express 4 + `pg` (API) · PostgreSQL 16 · Mercado Pago (suscripciones `PreApproval` y Checkout Pro de la tienda) · Google Identity Services (login) · Resend (mails) · Gemini (asistente y búsqueda inteligente, con respaldo configurable).

## Estructura
```
server.ts                  API completa (rutas, pagos, mails, webhooks, asistente)
assistant-knowledge.ts     qué sabe y cómo habla el asistente
src/                       sitio (páginas, componentes, contexto de sesión y de contenido)
src/lib/content.ts         registro de TODO el contenido editable desde el panel
migrations/                SQL idempotente, en orden (001…003)
scripts/                   deploy-api.sh, migrate.mjs, postbuild.mjs (SEO), test-api.mjs, seed-prueba.mjs
marketing/                 plan de captación, calendario de Instagram, prospectos
```

## Desarrollo local
```bash
createdb omia_dev && npm run db:migrate            # o: DATABASE_URL=postgres://… npm run db:migrate
psql omia_dev -f schema-vps.sql                    # solo la primera vez, antes de migrar
DATABASE_URL=postgres://localhost/omia_dev PORT=4100 APP_URL=http://localhost:5199 ADMIN_PASSWORD=<clave-local> npm run dev
VITE_API_URL=http://localhost:4100 npm run dev:web -- --port 5199
API=http://localhost:4100 node scripts/seed-prueba.mjs     # profesor y alumno de prueba
API=http://localhost:4100 npm run test:api                 # pruebas de punta a punta
```
Sin `MERCADOPAGO_ACCESS_TOKEN` y fuera de producción, los pagos usan un simulador (`/checkout-simulator`).

## Variables de entorno
Ver [`.env.example`](.env.example). En producción, el archivo `/app/.env` del contenedor **tiene prioridad** sobre las variables del proyecto Docker, así se rotan claves sin recrear el contenedor.

## Reglas del producto que no hay que romper
1. Omia **no procesa el pago de las clases**: el alumno envía una solicitud y arregla el pago con el profe.
2. La membresía es **mensual recurrente** (sin permanencia). La ficha nueva queda `pendiente` hasta que se activa el plan.
3. Los precios salen de `admin_config` (Admin → Configuración); el navegador nunca define importes.
4. Todo texto editable vive en `src/lib/content.ts` con su valor original: si no hay cambios en la base, el sitio usa ese valor.
5. Cuando cambia el producto, se actualiza también `assistant-knowledge.ts`.
