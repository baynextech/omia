# Beneficios de los planes: dónde se ve cada uno y cómo se configura

Todo lo que promete el sitio en `/para-profes` y en la sección de planes de la portada. Lo que define qué incluye cada plan está en un solo lugar del servidor: `PLAN_BENEFITS` en `server.ts`.

## Cómo crea cada profe o instituto su página (sin perder el look & feel)
La página de cada ficha usa **siempre la misma plantilla del sitio** (`TeacherProfile`): colores, tipografías (Gloock + Onest), botones y orden son los de Omia. Quien publica carga solo contenido.

1. **Registrarse** con «Registrate» y elegir «Profesor» o «Instituto». (Con Google también.)
2. Entrar a **Mi cuenta → Mi Página**. Arriba está la tarjeta **«Tu página en Omia»**: dirección propia, estado y una lista de lo que falta completar (barra de avance).
3. Completar el formulario: nombre, especialidad, zona, precio, días, presentación, fotos, contacto. Si es instituto: dirección, horarios y **grilla de clases**.
4. **Guardar Datos y Publicar Landing Page.** La ficha queda *pendiente* (solo la ve su dueño).
5. En **Plan Premium** elegir el plan y pagar por Mercado Pago (suscripción mensual). Con el primer pago la ficha pasa a *activa*: aparece en el directorio, en las búsquedas de zona y en el sitemap.
6. En **Tu página en Omia → Tu dirección propia** se puede cambiar el final de la URL (`omia.site/profesor/tu-nombre`) y **Copiar enlace** para compartirlo. **Ver cómo queda mi página** abre la página real (el dueño la ve aunque todavía no esté publicada).

Lo que el profe **no** puede tocar: colores, tipografías, orden de las secciones, ni el diseño de las tarjetas. Eso es lo que mantiene el aspecto del sitio madre.

## Plan Inicial ($39.900/mes)
| Beneficio | Dónde se ve | Dónde se configura |
|---|---|---|
| Landing page con URL propia | `omia.site/profesor/<slug>` | Mi Página → Tu dirección propia |
| Aparecer en búsquedas de zona | `/directorio` (filtro de zona), buscador y chat con IA | Mi Página → Barrio / Zona |
| 1 foto de perfil | Portada de la ficha y de la tarjeta | Mi Página → Galería (la foto «Portada») |
| Cobros 100% directos | Términos y página «Para profes» | No hay nada que configurar: Omia no cobra comisión por clase |

## Plan Destacado ($43.900/mes): todo lo anterior, más
| Beneficio | Dónde se ve | Dónde se configura |
|---|---|---|
| Insignia Pro dorada | Etiqueta «PRO» en la tarjeta del directorio, en la ficha y en el ranking de estudios | Automática al activarse el plan |
| Prioridad en IA (chatbot) | Al recomendar, el asistente Omi y la búsqueda inteligente muestran primero a Destacado e Institutos **entre los resultados que ya coinciden** con la consulta | Automática |
| Dashboard con estadísticas | Mi cuenta → Estadísticas (apariciones, visitas, solicitudes, valoración, quién visitó la ficha). Con Inicial muestra un candado | Automática |
| Hasta 5 fotos en galería | Galería de la ficha | Mi Página → Galería (se avisa cuántas incluye el plan) |

## Plan Institutos ($49.900/mes): todo lo del Destacado, más
| Beneficio | Dónde se ve | Dónde se configura |
|---|---|---|
| Múltiples profes asociados | Sección «Nuestro equipo» en la ficha del instituto; cada profe tiene su ficha | Mi cuenta → **Equipo** (hasta 20 profes) |
| Sección destacada en mapa | `/mapa`: bloque «Destacados en el mapa» y pin dorado con estrella; también el rótulo en la ficha y en `/estudios` | Dirección en Mi Página (se ubica por la dirección; si no se puede, por el barrio) |
| IA entrenada con tus horarios | El asistente Omi usa la **Grilla de clases** del instituto para recomendar por día y horario | Mi Página → Grilla de clases (una por línea) |
| Soporte por mail y WhatsApp | Plan Premium → «Soporte del Plan Institutos» (botones con los datos ya cargados) | El WhatsApp y el mail se cargan en Admin → Sitio → Contacto |

Las fotos incluidas por plan: Inicial 1, Destacado 5, Institutos 8. Mientras la ficha no tiene plan activo se puede ir armando con hasta 5 fotos, y la ficha pública muestra solo las que incluye el plan.

## Para probarlo en local
`sh scripts/sim/start-local.sh` (API con datos de ejemplo) y `VITE_API_URL=http://localhost:4100 npx vite --port 5173`. Cuentas de ejemplo (contraseña `omia-demo-1234`): `camila.mendez@sim.test` (Inicial), `martin.benitez@sim.test` (Destacado), `centro.luna@sim.test` (Institutos).
