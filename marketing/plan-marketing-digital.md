# Plan de marketing digital — primeros clientes de Omia

> **Supuesto a confirmar:** «los dos clientes» = los dos tipos de cliente que pagan: **profesores independientes** (Plan Inicial $39.900 / Destacado $43.900 por mes) e **institutos o estudios** (Plan Institutos $49.900 por mes). Los alumnos no pagan membresía. Si se refería a otra cosa (por ejemplo, conseguir solo dos clientes en total), el plan se achica sin cambiar el orden.

**Meta a 30 días:** 1 cliente pago de cada tipo (2 en total) y 15 fichas gratuitas reales cargadas, que son lo que hace que el sitio valga algo para el que llega. Meta a 90 días: 5 profes y 2 institutos pagos. Son metas de trabajo, no promesas: dependen de cuántas conversaciones se hagan por semana.

## 0. Antes de gastar un peso (la parte que más importa)
Hoy el directorio, el ranking y la tienda están vacíos. Si un profe entra a mirar y no ve a nadie, no paga. Por eso:

1. **Cargar 10 a 15 fichas reales** de profes que acepten salir gratis (los «fundadores»), con foto, barrio, precio, horarios y WhatsApp. Es la prueba social mínima.
2. **Conseguir 1 o 2 reseñas reales por ficha** pidiéndoselas a los alumnos de ese profe. No cargar reseñas inventadas: el sitio promete «opiniones reales» y la Defensa del Consumidor lo toma en serio.
3. Dejar la tienda en «Muy pronto» (ya está) y **no** nombrarla en ningún anuncio.
4. Tener operativos los mails (Resend) y la casilla `hola@omia.site`; sin eso las solicitudes de clase no le llegan al profe.
5. Decidir la oferta de lanzamiento (ver sección 2) y poder activarla desde Admin → Profesores.

## 1. Los dos clientes

| | **Profesor independiente** | **Instituto / estudio** |
|---|---|---|
| Quién es | Da clases solo o en 1 a 3 lugares; vive de sus alumnos | Dueño o encargado de un estudio con sala propia |
| Plan | Inicial $39.900 o Destacado $43.900 | Institutos $49.900 |
| Qué le duele | Depender del boca a boca y de Instagram; no aparecer cuando alguien busca «pilates cerca de Belgrano» | Salas con horarios vacíos; alumnos que no los encuentran por zona |
| Qué compra | Alumnos nuevos sin comisión + ficha con reseñas | Visibilidad por barrio + varios profes asociados |
| Cuánto tarda en decidir | Días | 2 a 4 semanas (consulta con socios) |
| Quién decide | Él o ella | Dueño; a veces hay que pasar por el encargado |
| Canal principal | Instagram (DM) y WhatsApp | WhatsApp y mail al dueño; visita corta si es del barrio |

Cuenta rápida para el argumento de venta: $39.900 equivalen a menos de 5 clases individuales de $8.000 a $10.000; con 1 o 2 alumnos nuevos por mes el plan se paga solo.

## 2. Oferta (una sola por cliente)
- **Profes:** «Primeros 30: ficha gratis 3 meses, sin permanencia». Hoy se activa a mano en Admin → Profesores (plan, activo y vencimiento a +90 días); anotar la fecha del primer cobro de cada uno.
- **Institutos:** lo mismo, 3 meses sin costo, más que Omia les arma la ficha y carga a su equipo de profes (el plan Institutos permite profes asociados).
- Detalle que cambia mucho la conversión: **cargarles la ficha nosotros** (ellos solo mandan datos por WhatsApp). Ya figura en las objeciones de `captacion-profes.md`.

## 3. Embudo y qué medir
Descubren → Responden → Cargan ficha → Reciben su primera solicitud → Pagan el primer mes.

| Etapa | Métrica | Primera referencia de trabajo |
|---|---|---|
| Contactos | DMs y WhatsApps enviados por semana | 40 a 60 (≈10 por día hábil) |
| Respuesta | % que contesta | 20 a 30 %; si es menor, cambiar el mensaje |
| Ficha | % de los que respondieron que cargan ficha | 50 % |
| Activación | Fichas con al menos 1 solicitud de clase en 30 días | 30 % |
| Pago | Fichas que pagan al terminar los 3 meses | Lo que diga la realidad: es el dato clave |

Todo en `marketing/prospectos.csv` (columna `estado`). Una vez por semana mirar: contactados, respuestas, fichas, activaciones.

## 4. Canales (de más barato a más caro)

### A. Instagram orgánico + DM (profes) — costo $0, 5 h por semana
- Cuenta: `@omiayoga.ar` o la personal del fundador (los mensajes de una persona convierten mejor).
- Buscar en `#yogabuenosaires`, `#pilatesreformerba`, `#yogapalermo`, `#profedeyoga` y las ubicaciones de cada barrio; perfiles de 500 a 10.000 seguidores.
- Antes del DM: seguir, dar like y comentar 2 publicaciones con algo real. Después usar el mensaje de `captacion-profes.md` (corto, con algo específico de su perfil).
- Contenido propio: el calendario de `instagram-30-dias.md`, 3 publicaciones por semana. Una de cada tres para profes («cómo conseguir alumnos sin comisión») y el resto para alumnos.
- Cada profe que se suma comparte su ficha en historias: el link ya trae vista previa con foto.

### B. WhatsApp y mail a estudios (institutos) — costo $0
- Lista inicial: los 10 de `prospectos.csv`, ampliar a 40 por barrio (Palermo, Belgrano, Recoleta, Villa Crespo, Caballito).
- Mensaje de WhatsApp y mail frío ya escritos en `captacion-profes.md`. Agregar una captura de cómo se vería **su** ficha: convierte más que explicar.
- Seguimiento a los 3 y a los 7 días, uno solo por vez. Si no hay respuesta, dejar para el mes siguiente.

### C. Alianzas (el canal con mejor relación costo/resultado)
- **Escuelas de formación de profes** (Hatha, Vinyasa, Stott, Balanced Body): ofrecerles ficha gratis para sus egresados y que ellos lo comuniquen. Una alianza trae 10 a 30 profes juntos.
- **Referidos:** pedirle a cada profe que se sumó los nombres de dos colegas. Primer mes bonificado a quien traiga a alguien que pague.
- Grupos de Facebook y WhatsApp de profes de CABA: no spamear; participar, aportar y recién después presentar Omia.

### D. Google: SEO local — costo bajo, resultado lento
- Verificar `omia.site` en Search Console y enviar `sitemap.xml` (pendiente 16 de `PENDIENTES.md`).
- Cada ficha ya tiene página con título propio. Cuando haya 15 fichas, aparecen búsquedas como «pilates reformer Belgrano».
- Perfil de Google Business Profile de Omia (opcional, bajo valor al principio).

### E. Publicidad paga (recién con 15 fichas y un proceso que funcione)
- Meta Ads (Instagram) a **profes** de CABA: anuncio de video corto o carrusel, destino `omia.site/para-profes`, intereses yoga y pilates + «instructor».
- Presupuesto de prueba: empezar con un monto que se pueda perder, por ejemplo US$5 a US$10 por día durante 10 días, y **medir costo por ficha creada**, no por clic. Si una ficha cuesta más de lo que vale (aprox. 1 mes de plan), pausar.
- No pautar para alumnos hasta que haya fichas de sobra en cada barrio.

## 5. Calendario de las primeras 4 semanas

| Semana | Foco | Entregables |
|---|---|---|
| 1 | Dejar el sitio listo y cargar fundadores | Resend + `hola@omia.site` activos; 5 fichas reales cargadas; lista de 60 profes y 40 estudios; oferta decidida |
| 2 | Contacto masivo a profes + primeras alianzas | 50 DMs; mensaje a 2 escuelas de formación; 10 fichas cargadas; empezar el calendario de Instagram |
| 3 | Estudios + reseñas | WhatsApp a 20 estudios con captura de su ficha; pedir reseñas a los alumnos de los fundadores; 15 fichas |
| 4 | Primer cobro y ajuste | Activar el primer plan pago de cada tipo; revisar el embudo; decidir si se prueba Meta Ads |

## 6. Presupuesto orientativo (mensual)
- Organico + alianzas: $0 en medios, tiempo del fundador.
- Diseño de piezas: Canva (gratis o plan básico).
- Prueba de pauta: US$150 a US$300 en el mes 2, solo si el embudo orgánico ya muestra respuesta.
- Mails (Resend): gratis hasta el volumen inicial.

## 7. Riesgos a tener presentes
- **Sitio vacío:** sin fichas y reseñas reales, el mejor mensaje no convierte. Es el riesgo principal.
- **Cobro:** hasta tener el token de producción de Mercado Pago y el webhook, los primeros clientes solo pueden usar el plan gratis activado a mano.
- **Reseñas:** nunca inventarlas ni pagar por ellas en un sitio que promete «opiniones reales».
- **Promesas de los planes:** «Hasta 5 fotos», «IA entrenada con tus horarios» y «Prioridad en IA» hoy no se cumplen tal cual (pendiente 15). Corregirlo antes de venderlos.
- **Datos personales:** guardar los datos de prospectos (Ley 25.326) y ofrecer baja en cada mensaje.

## 8. Qué se hace esta semana
1. Elegir la oferta de lanzamiento y confirmar a quién se le ofrece (¿30 profes? ¿cuántos institutos?).
2. Cargar las primeras 5 fichas fundadoras.
3. Mandar los primeros 10 DMs y los primeros 5 WhatsApps a estudios.
4. Abrir la planilla `prospectos.csv` y anotar cada contacto el mismo día.
