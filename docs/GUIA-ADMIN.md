# Guía del panel de administración (`/admin`)

Se entra con una cuenta de rol `admin` (el usuario inicial se crea al arrancar la API con `ADMIN_EMAIL` y `ADMIN_PASSWORD`). Sin sesión, `/admin` abre el ingreso y vuelve al panel; con una cuenta que no es admin avisa.

| Sección | Para qué sirve |
|---|---|
| **Dashboard** | Usuarios, profesionales activos, solicitudes de clase e ingresos. |
| **Sitio (textos e imágenes)** | Edita casi todo lo que se ve: portada, planes, preguntas frecuentes, tienda, SEO, textos legales, datos de contacto, cartel de anuncio, analítica y el asistente. Cada campo tiene «Restaurar original». |
| **Profesores** | Alta, edición, activar/pausar y borrar fichas (profesores e institutos). |
| **Productos** | Catálogo de la tienda: precio, stock, fotos, categoría. |
| **Usuarios** | Lista de cuentas y cambio de rol. |
| **Solicitudes** | Pedidos de clase que hicieron los alumnos. |
| **Reseñas** | Moderación (borrar reseñas). |
| **Transacciones** | Pagos de la tienda y cobros mensuales de planes. |
| **Suscripciones** | Estado de cada plan (activa, pausada, cancelada, vencida), ingreso mensual recurrente y próximos cobros. |
| **Pedidos** | Compras pagas de la tienda con datos de entrega; se cambia el estado (preparando, despachado con código de seguimiento, entregado) y al despachar el cliente recibe un mail. |
| **Noticias** | Editor del blog (Markdown), borrador/publicada. |
| **Mensajes** | Consultas, bajas y arrepentimientos que llegan por los formularios; se marcan como resueltos. |
| **Configuración** | Precio de cada plan (afecta el cobro), costo de envío fijo y «envío gratis desde». |

## Sitio → qué se puede editar
- **Datos del negocio y contacto:** mail, WhatsApp, Instagram, razón social, CUIT, domicilio, cartel de anuncio y analítica (Google Analytics y Meta Pixel, que solo cargan si el visitante acepta cookies).
- **Portada, Planes, Para profes, Directorio/Estudios/Ranking, Tienda:** títulos, textos, beneficios, preguntas frecuentes (con *cursiva* entre asteriscos).
- **Google y redes (SEO):** título y descripción de cada página e imagen para compartir. Los cambios se ven al instante en el navegador; las vistas previas de WhatsApp/Instagram se actualizan en el próximo build del sitio.
- **Textos legales y «Nosotros»:** se puede reemplazar el texto completo en Markdown.
- **Asistente virtual:** nombre, primer mensaje, sugerencias rápidas y un campo libre «Novedades, promociones y reglas» que el asistente lee en cada respuesta.

## Tareas frecuentes
- **Anunciar una promo:** Sitio → Datos del negocio → *Cartel de anuncio* (y el enlace). Para que el chat también la conozca: Sitio → Asistente → *Novedades*.
- **Cambiar un precio:** Configuración (no en Sitio).
- **Dar de baja una ficha:** Profesores → pausar.
- **Despachar un pedido:** Pedidos → estado «despachado» → cargar código de seguimiento.
- **Atender una baja o un arrepentimiento:** Mensajes (llegan además al mail `CONTACT_EMAIL`); responder dentro de 48 h hábiles y marcar resuelto.
