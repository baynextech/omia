# Cómo revisar omia.site en un celular real

Objetivo: ver el sitio como lo ve un alumno o un profe desde el teléfono y anotar qué se rompe. Dura unos 30 minutos.

## Qué necesitás
- Un celular (idealmente uno de cada sistema: iPhone con Safari y Android con Chrome).
- Estar con **datos móviles** al menos una vez (no solo Wi-Fi): así se ve cómo carga en una conexión normal.
- Para anotar: la app de notas y capturas de pantalla.

## Paso 1: abrir el sitio
1. En el celular abrí `https://omia.site`.
2. Contá cuánto tarda en aparecer la portada. Más de 4 segundos con datos móviles es lento (las fotos hoy pesan demasiado, ver pendiente 19).
3. Girá el teléfono en horizontal y volvé a vertical: nada debería quedar cortado.

## Paso 2: recorrido (marcá cada punto)
Menú y portada
- [ ] Aparece un menú que se pueda abrir con el dedo (el de escritorio no entra en 390 px).
- [ ] «Buscá un Profe» y «Estudios e Institutos» se tocan sin errar.
- [ ] El botón redondo del chat (Omi) no tapa el texto ni los botones de abajo.
- [ ] El texto se lee sin hacer zoom y no hay scroll hacia los costados.

Directorio y estudios
- [ ] Los filtros (disciplina, zona, precio, día) se abren y se cierran bien.
- [ ] El buscador con IA acepta texto y el teclado no tapa el botón «Buscar».

Tienda
- [ ] Muestra el aviso «Muy pronto» (sin carrito, ni envíos, ni filtros).

Para profes
- [ ] Los tres planes se ven uno abajo del otro y los botones se alcanzan.
- [ ] Abrir una pregunta frecuente funciona.

Cuenta
- [ ] «Registrate» abre un formulario que entra en pantalla y el teclado no tapa el botón de enviar.
- [ ] Mostrar y ocultar la contraseña funciona.
- [ ] Hay un botón de Google; tocarlo abre su ventana (no hace falta terminar el ingreso).

Chat Omi
- [ ] Se abre a pantalla casi completa, se puede escribir y se cierra con la X.
- [ ] Preguntá «¿cuánto cuesta el plan para profes?»: debe contestar con los precios reales.

Legales
- [ ] Términos, Privacidad, Contacto y Arrepentimiento se leen sin cortes.
- [ ] El banner de cookies se puede cerrar y no vuelve a aparecer en cada página.

Página inexistente
- [ ] Escribí `omia.site/cualquier-cosa`: debe mostrar «No encontramos esta página».

## Paso 3: qué anotar cuando algo falla
Por cada problema, mandá:
1. Captura de pantalla.
2. Modelo del teléfono y sistema (ej. «iPhone 13, iOS 18, Safari»; «Samsung A54, Android 14, Chrome»).
3. Página y qué hiciste justo antes.
4. Si podés, con datos móviles o Wi-Fi.

## Paso 4: velocidad en móvil (sin celular)
Abrí `https://pagespeed.web.dev/analysis?url=https://omia.site` y mirá la pestaña **Móvil**. Guardá la captura: sirve para comparar antes y después de comprimir las imágenes.

## Paso 5 (opcional): ver los errores del celular en la compu
- **Android + Chrome:** activá «Depuración por USB» en el teléfono, conectalo, abrí `chrome://inspect` en la compu y tocá «inspect» sobre la pestaña de omia.site.
- **iPhone + Safari:** en el iPhone, Ajustes → Safari → Avanzado → Inspector web; en la Mac, Safari → Desarrollar → [tu iPhone] → omia.site.

## Sin celular a mano: simular en la compu
En Chrome, abrí omia.site, `Cmd + Opt + I` y después `Cmd + Shift + M` para el modo dispositivo; elegí «iPhone 14» o «Pixel 7». No reemplaza al celular real (táctil, teclado, velocidad), pero sirve para ver el diseño.
