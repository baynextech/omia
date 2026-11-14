# Plan de marketing digital — primeros clientes de Omia

> **Cómo gana plata Omia:** pagan al sitio, todos los meses, dos tipos de cliente: **profesores particulares** (Plan Inicial $39.900 / Destacado $43.900) e **institutos o estudios** de yoga y pilates (Plan Institutos $49.900). El tercer público, **los alumnos** (las personas que buscan, miran y contratan a esos profes e institutos), **no le paga nada a Omia**: le paga directo al profesor o instituto cuando lo contrata. Aun así los alumnos son parte del plan, porque sin alumnos que entren y pidan clases ningún profe renueva el plan.

Es un mercado de dos lados: la **oferta** (profes e institutos) paga y la **demanda** (alumnos) llena el directorio de movimiento. Por eso el plan va en este orden: primero la oferta, después la demanda barrio por barrio.

**Meta final: 50 profesores particulares + 50 institutos, los dos tipos, pagando la membresía mensual** (100 clientes). *Supuesto a confirmar: que los 50 y 50 son clientes que pagan, no solo fichas cargadas, y que el plazo no está fijado todavía.* **No hay pruebas ni meses gratis en ningún lado:** el plan se cobra mensual desde el primer mes, sin permanencia y con el arrepentimiento legal de 10 días. Los primeros 30 días son de arranque: cobro operativo, lista armada, conversaciones con profes e institutos y los primeros pagos.

## Meta: 50 + 50, hecha números

**Cuánto significa:** con los precios de lista, 50 profes (Inicial $39.900 o Destacado $43.900) y 50 institutos ($49.900) suman entre **$4,49 y $4,69 millones por mes**, antes de comisiones de Mercado Pago e impuestos.

**Cómo funciona el embudo sin prueba gratis:** como la ficha se publica cuando el plan está activo, cada alta ya es un cliente que paga. El camino es Contactos → Responden → Pagan el primer mes. Los porcentajes son hipótesis para ajustar con las primeras semanas, no datos de mercado:

| Paso (por cada tipo de cliente) | Hipótesis A | Hipótesis B (más prudente) |
|---|---|---|
| Contestan entre los contactados | 25 % | 25 % |
| Pagan el primer mes entre los que contestan | 15 % | 10 % |
| **Contactos para llegar a 50 pagos** | **≈ 1.300** | **2.000** |

**Cuánto tarda**, según el ritmo de contactos por cada tipo de cliente:

| Ritmo | Contactos por mes | Hipótesis A | Hipótesis B |
|---|---|---|---|
| 60 por semana por tipo (120 en total, ≈ 15 h semanales) | 240 por tipo | ≈ 5,5 meses | ≈ 8 meses |
| 120 por semana por tipo (el doble, repartido o automatizado) | 480 por tipo | ≈ 3 meses | ≈ 4 meses |

Son plazos para *llegar* a 50 altas de cada tipo. **Las bajas hay que sumarlas:** quien cancela después del primer mes deja un hueco que se llena con más contactos. Medirlo desde el primer mes (ver «Retención» en la sección 3).

**Qué cambia al no regalar meses:**
- **A favor:** hay ingresos desde el primer cliente, entran los que de verdad quieren la herramienta y el dato de conversión es real desde el día uno.
- **En contra:** el arranque es más lento y el directorio tarda en llenarse (sin fichas gratis de «fundadores» hay que mostrar valor de otra forma; ver la sección 0).
- **Requisito:** sin el token de producción de Mercado Pago y su webhook **no se puede cobrar a nadie**. Es lo primero a resolver (pendientes 2 y 3 de `PENDIENTES.md`).

**Qué significa para el trabajo:**
- El ritmo de 120 contactos por semana pide repartir o automatizar los mensajes y seguimientos (planilla compartida, plantillas, recordatorios; el n8n que ya tenés sirve para los seguimientos).
- **Institutos:** antes de comprometerse con 50 hay que contar cuántos estudios de yoga y pilates existen en la zona de trabajo (CABA y GBA). No lo verifiqué: si el total son 150, conseguir 50 es una tercera parte del mercado y hay que abrir otras ciudades. Primer paso: armar la lista completa de estudios con nombre, barrio y contacto.
- **Qué mueve la aguja** (por orden de impacto): cargarles la ficha nosotros apenas pagan, mostrar reseñas reales, alianzas con escuelas de formación (traen decenas de profes juntos) y los referidos de los que ya están.

## 0. Antes de gastar un peso (la parte que más importa)
Hoy el directorio, el ranking y la tienda están vacíos. Si un profe entra a mirar y no ve a nadie, no paga. Por eso:

1. **Tener operativo el cobro:** token de producción de Mercado Pago y webhook. Sin esto nadie puede pagar el plan.
2. **Mostrar cómo se ve una ficha sin regalar nada:** una ficha de ejemplo claramente marcada «Ejemplo» para las capturas de los mensajes, y las fichas de los primeros que paguen apenas entren. Cuando haya reseñas reales (las que pidan los profes a sus propios alumnos), mostrarlas. No cargar reseñas inventadas: el sitio promete «opiniones reales» y la Defensa del Consumidor lo toma en serio.
3. Dejar la tienda en «Muy pronto» (ya está) y **no** nombrarla en ningún anuncio.
4. Tener operativos los mails (Resend) y la casilla `hola@omia.site`; sin eso las solicitudes de clase no le llegan al profe.
5. Dejar clara la oferta (sección 2): plan mensual, sin permanencia, sin comisión y con el arrepentimiento de 10 días.

## 1. Los tres públicos

| | **Profesor particular** (paga) | **Instituto / estudio** (paga) | **Alumno** (no paga a Omia) |
|---|---|---|---|
| Quién es | Da clases de yoga o pilates solo o en 1 a 3 lugares; vive de sus alumnos | Dueño o encargado de un estudio con sala propia | Persona que busca clases cerca de su casa o trabajo y las contrata |
| Qué paga | Plan Inicial $39.900 o Destacado $43.900 por mes | Plan Institutos $49.900 por mes | Nada a Omia; le paga al profe o al instituto directamente |
| Qué le duele | Depender del boca a boca y de Instagram; no aparecer cuando alguien busca «pilates cerca de Belgrano» | Salas con horarios vacíos; alumnos que no los encuentran por zona | No saber a quién elegir: precios, zona, horarios y opiniones desperdigados |
| Qué gana con Omia | Alumnos nuevos sin comisión + ficha con reseñas | Visibilidad por barrio + varios profes asociados | Buscar por barrio, disciplina y precio, leer reseñas reales y escribirle directo al profe |
| Cuánto tarda en decidir | Días | 2 a 4 semanas (consulta con socios) | Minutos u horas |
| Canal principal | Instagram (DM) y WhatsApp | WhatsApp y mail al dueño; visita corta si es del barrio | Instagram, Google, boca a boca y los propios profes que comparten su ficha |

Cuenta rápida para el argumento de venta a quien paga: $39.900 equivalen a menos de 5 clases individuales de $8.000 a $10.000; con 1 o 2 alumnos nuevos por mes el plan se paga solo.

## 2. Oferta (una sola por cada público)
- **Alumnos:** «Encontrá tu profe de yoga o pilates por barrio, leé opiniones reales y escribile directo. Sin costo y sin comisiones». No hay nada que cobrarles ni que regalarles: lo que hay que ganar es que entren, busquen y pidan una clase.
- **Profes:** «Cobrás el 100% de tus clases, sin comisión. Pagás un plan mensual fijo, sin permanencia: te das de baja cuando quieras y, si te arrepentís, tenés 10 días para revocar». Argumento de precio: con 1 o 2 alumnos nuevos por mes el plan se paga solo.
- **Institutos:** lo mismo, más que Omia les arma la ficha y carga a su equipo de profes (el plan Institutos permite profes asociados).
- **Sin pruebas ni meses gratis, en ningún mensaje ni en el sitio.** Si más adelante se quisiera incentivar de otra manera, es una decisión aparte.
- Detalle que cambia mucho la conversión: **cargarles la ficha nosotros** (ellos solo mandan datos por WhatsApp). Ya figura en las objeciones de `captacion-profes.md`.

## 3. Embudo y qué medir
**Lado que paga (profes e institutos):** Descubren → Responden → Pagan el primer mes y se carga su ficha → Reciben su primera solicitud → Renuevan el segundo mes.

| Etapa | Métrica | Primera referencia de trabajo |
|---|---|---|
| Contactos | DMs y WhatsApps enviados por semana | 40 a 60 (≈10 por día hábil) |
| Respuesta | % que contesta | 20 a 30 %; si es menor, cambiar el mensaje |
| Alta | % de los que respondieron que pagan el primer mes | 10 a 15 % (hipótesis) |
| Activación | Fichas pagas con al menos 1 solicitud de clase en 30 días | 30 % |
| Retención | Clientes que renuevan el segundo mes | Lo que diga la realidad: es el dato clave |

**Lado de los alumnos (no pagan, pero mueven todo):** Ven una ficha o el sitio → Buscan o chatean con Omi → Entran a una ficha → Piden la clase → Dejan una reseña.

| Etapa | Métrica | Dónde se ve |
|---|---|---|
| Visitas | Visitantes por semana y de dónde vienen | Google Analytics (pendiente 16) |
| Búsqueda | Visitas que usan filtros o el buscador con IA | Analytics y panel admin |
| Interés | Visitas a fichas por visitante | Campo `impressions` de cada ficha |
| Solicitud | Solicitudes de clase por semana | Admin → Solicitudes |
| Reseña | % de alumnos que dejan reseña después de la clase | Admin → Reseñas y la página Ranking |

Los datos de los alumnos (nombre, mail, solicitudes) se tratan como dice la política de privacidad, y solo se contacta con novedades a quien dio su consentimiento.

Todo en `marketing/prospectos.csv` (columna `estado`). Una vez por semana mirar: contactados, respuestas, altas, activaciones y renovaciones.

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
- **Escuelas de formación de profes** (Hatha, Vinyasa, Stott, Balanced Body): proponerles una alianza para que comuniquen Omia a sus egresados (condiciones a definir, sin regalar meses). Una alianza puede traer 10 a 30 profes juntos.
- **Referidos:** pedirle a cada profe que se sumó los nombres de dos colegas. Sin incentivo económico: se pide como favor y se agradece mostrando su ficha en las redes de Omia.
- Grupos de Facebook y WhatsApp de profes de CABA: no spamear; participar, aportar y recién después presentar Omia.

### D. Google: SEO local — costo bajo, resultado lento
- Verificar `omia.site` en Search Console y enviar `sitemap.xml` (pendiente 16 de `PENDIENTES.md`).
- Cada ficha ya tiene página con título propio. Cuando haya 15 fichas, aparecen búsquedas como «pilates reformer Belgrano».
- Perfil de Google Business Profile de Omia (opcional, bajo valor al principio).

### E. Alumnos (la demanda) — empezar cuando haya 15 fichas
Un alumno solo se queda si encuentra a alguien cerca. Por eso se salen a buscar **barrio por barrio**, empezando por donde haya más fichas cargadas.
- **Los propios profes:** cada profe comparte su ficha en historias y con su lista de WhatsApp; es el canal más barato y el más confiable, porque llegan alumnos que ya lo conocen y pueden dejar la primera reseña real.
- **Instagram de Omia:** 2 de cada 3 publicaciones del calendario pensadas para el alumno: «dónde hacer pilates reformer en {barrio}», «cómo elegir profe», «clases individuales o en grupo».
- **Google:** las fichas y las páginas de zona aparecen en búsquedas tipo «yoga en Villa Crespo». Es lento pero gratis y se acumula.
- **Chat Omi y buscador con IA:** son la gracia del sitio frente a un listado común; mostrarlos en videos cortos («le conté a Omi lo que necesitaba y me sugirió estos tres profes»).
- **Alianzas locales:** gimnasios y estudios de barrio, cafés y negocios de bienestar, para dejar un cartel o un código QR hacia el directorio de la zona.
- **Reseñas:** al terminar una clase, el profe le pide al alumno que deje su opinión. Es lo que hace que el siguiente alumno confíe. Prohibido inventarlas o comprarlas.
- **Importante en todo mensaje al alumno:** el sitio **no cobra ni comisiona**: el pago de la clase se arregla directo con el profe. Decirlo explícito evita desconfianza.

### F. Publicidad paga (recién con 15 fichas y un proceso que funcione)
- Meta Ads (Instagram) a **profes** de CABA: anuncio de video corto o carrusel, destino `omia.site/para-profes`, intereses yoga y pilates + «instructor».
- Presupuesto de prueba: empezar con un monto que se pueda perder, por ejemplo US$5 a US$10 por día durante 10 días, y **medir costo por profe que paga el primer mes**, no por clic. Si un cliente cuesta más de lo que deja en 2 o 3 meses de plan, pausar.
- Pautar para **alumnos** recién cuando haya fichas de sobra en el barrio al que se apunta (por ejemplo 5 o más en Palermo): si el visitante no encuentra a nadie, se pierde el dinero. Ahí el objetivo del anuncio es «solicitud de clase», no clics.

## 5. Calendario de las primeras 4 semanas

| Semana | Foco | Entregables |
|---|---|---|
| 1 | Dejar el sitio listo para cobrar | Cobro por Mercado Pago operativo; Resend + `hola@omia.site` activos; ficha de ejemplo para las capturas; lista de 60 profes y 40 estudios |
| 2 | Contacto a profes + primeras alianzas | 50 DMs; mensaje a 2 escuelas de formación; empezar el calendario de Instagram; cargar la ficha de cada profe que pague |
| 3 | Estudios + reseñas | WhatsApp a 20 estudios con una captura de cómo se vería su ficha; pedir reseñas a los alumnos de los primeros profes; seguimiento de los DMs |
| 4 | Primeros pagos, primeros alumnos y ajuste | Primer plan pago de cada tipo; que cada profe comparta su ficha con sus alumnos; contar solicitudes de clase; revisar los dos embudos; decidir si se prueba Meta Ads |

## 6. Presupuesto orientativo (mensual)
- Organico + alianzas: $0 en medios, tiempo del fundador.
- Diseño de piezas: Canva (gratis o plan básico).
- Prueba de pauta: US$150 a US$300 en el mes 2, solo si el embudo orgánico ya muestra respuesta.
- Mails (Resend): gratis hasta el volumen inicial.

## 7. Riesgos a tener presentes
- **Sitio casi vacío al arrancar:** sin fichas gratis de «fundadores», el directorio tarda en llenarse y el mejor mensaje convierte menos. Es el riesgo principal: se compensa con capturas de una ficha de ejemplo, reseñas reales apenas aparezcan y empezar barrio por barrio (por ejemplo 5 pagos en Palermo antes de abrir otro).
- **Cobro:** hasta tener el token de producción de Mercado Pago y el webhook no se puede vender. Es el bloqueo número uno.
- **Reseñas:** nunca inventarlas ni pagar por ellas en un sitio que promete «opiniones reales».
- **Promesas de los planes:** «Hasta 5 fotos», «IA entrenada con tus horarios» y «Prioridad en IA» hoy no se cumplen tal cual (pendiente 15). Corregirlo antes de venderlos.
- **Datos personales:** guardar los datos de prospectos (Ley 25.326) y ofrecer baja en cada mensaje.

## 8. Qué se hace esta semana
1. Activar el cobro real: token de producción y webhook de Mercado Pago.
2. Preparar la ficha de ejemplo y las capturas para los mensajes.
3. Mandar los primeros 10 DMs y los primeros 5 WhatsApps a estudios.
4. Abrir la planilla `prospectos.csv` y anotar cada contacto el mismo día.
