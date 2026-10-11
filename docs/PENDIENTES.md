# Pendientes importantes de Omia

*Actualizado: 11/10/2026. Ordenados por impacto. «Vos» = requiere tu cuenta o decisión; «Yo» = lo puede hacer Claude.*

## Estado en una línea
Sitio y API publicados y andando (login con Google y con mail, panel con editor, asistente, legales, SEO). **Todavía no se puede cobrar de verdad** y **no hay profesores reales cargados**: esas dos cosas son lo que separa a Omia de ganar dinero.

## A · Para empezar a cobrar
| # | Pendiente | Quién | Esfuerzo |
|---|---|---|---|
| 1 | **Probar la suscripción de punta a punta con Mercado Pago (modo prueba)**: registrarse como profe con el mail de la cuenta compradora de prueba, pagar con tarjeta de prueba `APRO`, verificar plan activo, ficha en el directorio y fila en Admin → Suscripciones. | Vos (yo arreglo lo que falle) | 15 min |
| 2 | **Webhook de Mercado Pago**: en Developers → aplicación yogapp → Webhooks, URL `https://api.omia.site/api/webhooks/mercadopago`, eventos «Pagos» y «Planes y suscripciones»; cargar la clave secreta como `MERCADOPAGO_WEBHOOK_SECRET`. Sin esto no se registran los cobros del mes siguiente. | Vos + yo | 20 min |
| 3 | **Pasar a producción**: activar credenciales de producción de yogapp (formulario + posible verificación de identidad), cargar `MERCADOPAGO_ACCESS_TOKEN` real en `/app/.env`, probar con un plan a precio simbólico y devolver el pago. | Vos | 1 h |
| 4 | **Mails (Resend)**: crear cuenta, verificar el dominio `omia.site` (registros SPF/DKIM en el DNS de Hostinger), cargar `RESEND_API_KEY`, `EMAIL_FROM` y `CONTACT_EMAIL`. **Es crítico**: sin esto el profe no se entera de las solicitudes de clase, y no llegan bienvenida, recuperar contraseña ni confirmaciones de cobro. | Vos (cuentas) + yo | 1 h |
| 5 | **Casilla `hola@omia.site`**: crearla (o cambiar el mail de contacto en Admin → Sitio). Ahí llegan consultas, bajas y arrepentimientos. | Vos | 15 min |

## B · Para tener qué vender
| # | Pendiente | Quién | Esfuerzo |
|---|---|---|---|
| 6 | **Conseguir los primeros 20–30 profes e institutos reales** (hoy hay 0 en producción). Usar `marketing/captacion-profes.md` y `prospectos.csv`; cargar las fichas desde Admin → Profesores si prefieren que se las armes. | Vos (contacto) + yo (textos, carga) | Continuo |
| 7 | **Decidir la oferta de lanzamiento** (ej. 3 meses gratis a los primeros 30). Hoy se puede dar activando el plan a mano en Admin → Profesores (campos plan, activo y vencimiento); no hay cupón automático. | Vos decidís, yo implemento si hace falta | 30 min |
| 8 | **Tienda: abrir o esconder.** No hay productos reales cargados ni logística definida; el sitio promete «despacho en 24 hs», «garantía 30 días» y «3 cuotas sin interés». O se cargan productos y se cumple, o se oculta la tienda hasta tenerla. | Vos decidís, yo ejecuto | Variable |

## C · Seguridad (hacerlo pronto)
| # | Pendiente | Quién | Esfuerzo |
|---|---|---|---|
| 9 | **Contraseña propia para el admin.** Hoy el admin de producción usa la clave compartida que figura en tus notas. Falta una pantalla «cambiar contraseña» en el perfil (la puedo hacer) o usar «Olvidé mi contraseña» una vez que haya mails. | Yo | 1 h |
| 10 | **Rotar claves expuestas**: clave de Gemini (en tus notas), claves de Supabase y Mercado Pago que quedaron en el historial del repo público, y la contraseña compartida entre Hostinger, VPS y n8n. | Vos (consolas) | 1 h |
| 11 | **Respaldo automático de la base** (hoy solo manual): tarea diaria con `pg_dump` y copia fuera del servidor. | Yo (con tu OK para el cron) | 1 h |
| 12 | **Gemini**: confirmar el límite gratis o cargar la clave de Groq como respaldo si el chat crece. | Vos (clave) | 15 min |

## D · Legal y negocio
| # | Pendiente | Quién | Esfuerzo |
|---|---|---|---|
| 13 | **Datos reales del titular**: razón social, CUIT y domicilio (Admin → Sitio → Datos del negocio). | Vos | 10 min |
| 14 | **Revisión de contador y abogado** de Términos, Privacidad y del esquema de cobro; **facturación (ARCA)** de cada membresía mensual y régimen impositivo. | Vos | Variable |
| 15 | **Corregir promesas de los planes** que hoy no se cumplen: «Hasta 5 fotos» (el sistema deja 8 en todos los planes), «IA entrenada con tus horarios», «Prioridad en IA». O se implementan o se editan en Admin → Sitio → Planes. | Yo | 2 h |

## E · Para crecer
| # | Pendiente | Quién |
|---|---|---|
| 16 | **Google Search Console** (verificar omia.site y enviar `sitemap.xml`) + IDs de Google Analytics y Meta Pixel en Admin → Sitio. | Vos (cuentas) |
| 17 | **Mejoras de marca 1–4** del manual: fuentes (Fraunces + Inter), botón en `#5F7348` (hoy no cumple contraste), tokens de color y 4 radios de esquina. | Yo |
| 18 | **Símbolo del logo, favicon e imagen para compartir** (1200×630). | Yo + diseño |
| 19 | **Fotos propias y comprimidas** (WebP < 250 KB) en lugar de PNG de 1,2 MB y fotos de stock. | Vos (fotos) + yo |
| 20 | **Instagram**: calendario de 30 días y plantillas (`marketing/instagram-30-dias.md`). | Vos + yo |
| 21 | **Red social** (publicaciones, seguir, comentarios, notificaciones) y moderación de reseñas: lo más grande, para después del lanzamiento. | Yo |

## F · Orden sugerido para esta semana
1. Probar suscripción en modo prueba (#1) → 2. Resend + casilla de mail (#4, #5) → 3. Contraseña del admin y rotar claves (#9, #10) → 4. Datos legales (#13) → 5. Empezar a hablar con profes (#6) → 6. Producción de Mercado Pago (#3) cuando haya al menos 5 profes dispuestos.

## Hecho (no hace falta volver a verlo)
Sitio y API desplegados · migraciones 001–003 · login con Google (proyecto Omia, gratis) · asistente «Omi» · panel de administración con editor del sitio · usuarios con método de registro y exportación CSV · menú de cuenta con foto · páginas legales, botón de arrepentimiento y de baja · SEO con sitemap y páginas con título propio · manual de marca (PDF) · documentación en `README.md`, `DEPLOY.md`, `docs/`.
