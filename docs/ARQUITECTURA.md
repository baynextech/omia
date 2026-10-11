# Arquitectura

```
Navegador ──► omia.site (Hostinger, archivos estáticos: React compilado + páginas prerenderizadas para SEO)
                │  VITE_API_URL
                ▼
          api.omia.site ──► Traefik ──► contenedor omia-api (Node 22, /app/dist/server.cjs)
                                              │ red omia-net
                                              ▼
                                       contenedor omia-db (PostgreSQL 16, volumen ./pgdata)
Mercado Pago ──webhook──► /api/webhooks/mercadopago      Google ──ID token──► /api/auth/google
Resend ◄── mails transaccionales                          Gemini / respaldo ◄── /api/chat
```

## Flujos clave
- **Alta de profesional:** registro (rol profesor/instituto) → ficha `pendiente` → suscripción (`POST /api/subscriptions/checkout` crea un `PreApproval` y devuelve `init_point`) → webhook/sync pasa la suscripción a `activa`, activa el plan y publica la ficha.
- **Renovación:** Mercado Pago cobra cada mes; los avisos `subscription_authorized_payment` registran el pago (`transactions`, único por pago) y mandan mail. `plan_expires_at = próximo cobro + 5 días de gracia`. Un proceso horario consulta a Mercado Pago antes de vencer y da de baja los planes vencidos.
- **Baja:** cancela el `PreApproval`; los beneficios siguen hasta el fin del período pagado.
- **Clases:** `POST /api/bookings` crea una solicitud y avisa al profesor por mail; el pago es directo entre las partes.
- **Tienda:** precio y stock se calculan en el servidor; el pago por Checkout Pro; el webhook aprueba la transacción, descuenta stock y manda mails.
- **Contenido editable:** `site_content(key, value jsonb)`; el sitio pide `GET /api/content` y usa los valores originales de `src/lib/content.ts` para lo que no figure. Imágenes subidas: tabla `media`, servidas por `/api/media/:id`.
- **Asistente:** `POST /api/chat` arma el prompt con `assistant-knowledge.ts` + datos vigentes (fichas que coinciden con la consulta, planes, envíos, novedades de `assistant.extra`) y llama a Gemini (modelo principal → modelos de respaldo → proveedor compatible con OpenAI como Groq).
- **SEO:** `scripts/postbuild.mjs` genera una página por ruta con título/descripción/canonical propios y el `sitemap.xml`; la API también expone `/sitemap.xml`.

## Seguridad
- Contraseñas con bcrypt, sesión por JWT de 30 días, enlaces de recuperación de un solo uso (se guarda solo el hash).
- Precios siempre del servidor; los pagos se confirman consultando a Mercado Pago (nunca por lo que diga el navegador); webhook con firma opcional (`MERCADOPAGO_WEBHOOK_SECRET`) y avisos idempotentes.
- Límite de intentos en login, registro, recuperación, contacto y chat.
- Datos de terceros (fichas, productos, notas) se tratan como DATOS en el prompt del asistente.
