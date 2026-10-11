import { SITE } from "./site";

// Registro de todo lo que se puede editar desde el panel de administración (Admin → Sitio).
// Cada campo tiene su texto original (`def`): si el administrador no lo cambió, el sitio usa ese valor.
// Para sumar un campo editable: agregarlo acá y leerlo en la página con useContent().

export type FieldType = "text" | "rich" | "textarea" | "list" | "pairs" | "image" | "url" | "markdown";
export type Pair = { a: string; b: string };
export type Value = string | string[] | Pair[];

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  def: Value;
  help?: string;
  pairLabels?: [string, string]; // para type "pairs": nombre de cada columna
}

export interface Group {
  id: string;
  title: string;
  description: string;
  path: string; // dónde se ve (para el botón "Ver en el sitio")
  fields: Field[];
}

const RICH_HELP = "Podés poner *entre asteriscos* lo que quieras en cursiva y color.";

export const GROUPS: Group[] = [
  {
    id: "global",
    title: "Datos del negocio y contacto",
    description: "Mail, WhatsApp, redes y datos legales. Aparecen en el pie del sitio, en las páginas legales y en los botones de contacto.",
    path: "/contacto",
    fields: [
      { key: "site.announcement", label: "Cartel de anuncio (arriba de todo el sitio)", type: "text", def: "", help: "Dejalo vacío para ocultarlo. Ej: «Primeros 30 profes: 3 meses gratis»." },
      { key: "site.announcement_link", label: "Enlace del cartel (opcional)", type: "url", def: "", help: "Ej: /para-profes" },
      { key: "contact.email", label: "Email de contacto", type: "text", def: SITE.email, help: "Se muestra en el sitio. Los avisos internos del servidor se configuran aparte (variable CONTACT_EMAIL)." },
      { key: "contact.whatsapp", label: "WhatsApp (solo números, con código de país)", type: "text", def: SITE.whatsapp, help: "Ej: 5491155550000. Vacío = no se muestra el botón." },
      { key: "contact.instagram", label: "Instagram (usuario sin @)", type: "text", def: SITE.instagram },
      { key: "legal.name", label: "Razón social / titular", type: "text", def: SITE.legalName },
      { key: "legal.cuit", label: "CUIT", type: "text", def: SITE.cuit, help: "Vacío = no se muestra." },
      { key: "legal.address", label: "Domicilio legal", type: "text", def: SITE.address },
      { key: "legal.updated", label: "Fecha de última actualización de los textos legales", type: "text", def: SITE.lastLegalUpdate },
      { key: "analytics.ga_id", label: "Google Analytics (ID de medición, ej. G-XXXXXXX)", type: "text", def: SITE.gaId, help: "Se activa solo si el visitante acepta las cookies. Vacío = apagado." },
      { key: "analytics.meta_pixel", label: "Meta Pixel (ID numérico)", type: "text", def: SITE.metaPixelId, help: "Para medir y remarketing de Instagram/Facebook. Vacío = apagado." },
      { key: "footer.tagline", label: "Frase del pie del sitio", type: "textarea", def: "La plataforma para encontrar profesores e institutos de Yoga & Pilates en Argentina." },
      { key: "footer.bottom", label: "Línea inferior del pie", type: "text", def: "Yoga · Pilates · Buenos Aires" },
    ],
  },
  {
    id: "home-hero",
    title: "Portada · Cabecera",
    description: "Lo primero que se ve al entrar al sitio.",
    path: "/",
    fields: [
      { key: "home.hero.eyebrow", label: "Etiqueta superior", type: "text", def: "Yoga · Pilates · Bienestar · Buenos Aires" },
      { key: "home.hero.title", label: "Título", type: "rich", def: "Encontrá tu profe, *tu centro* y tu práctica.", help: RICH_HELP },
      { key: "home.hero.subtitle", label: "Subtítulo", type: "textarea", def: "Conectá con los mejores instructores e institutos de Yoga & Pilates en Argentina. Leé opiniones reales, reservá tu lugar y equipate." },
      { key: "home.hero.cta1", label: "Botón principal", type: "text", def: "Buscá un Profe" },
      { key: "home.hero.cta2", label: "Botón secundario", type: "text", def: "Estudios e Institutos" },
      { key: "home.hero.video", label: "Video de fondo (URL .mp4)", type: "url", def: "/videos/hero_1.mp4", help: "Pegá la dirección de un video MP4 liviano (menos de 8 MB conviene)." },
    ],
  },
  {
    id: "home-sections",
    title: "Portada · Secciones",
    description: "Los bloques que siguen a la cabecera.",
    path: "/",
    fields: [
      {
        key: "home.intro", label: "Tres ventajas (debajo de la cabecera)", type: "pairs", pairLabels: ["Título", "Descripción"],
        def: [
          { a: "Perfiles reales", b: "Cada profe y cada instituto tiene su propia ficha, con reseñas de alumnos que tomaron clases." },
          { a: "Reservá sin comisiones", b: "Contactá directamente con el profe. El 100% del pago va al instructor, sin intermediarios." },
          { a: "Encontrá tu zona", b: "Buscá por barrio en Buenos Aires. Palermo, Belgrano, Recoleta y 11 zonas más." },
        ] as Pair[],
      },
      { key: "home.map.eyebrow", label: "Buscador · Etiqueta", type: "text", def: "Encontrá tu zona" },
      { key: "home.map.title", label: "Buscador · Título", type: "rich", def: "Profesores *cerca tuyo*", help: RICH_HELP },
      { key: "home.teachers.eyebrow", label: "Profesionales destacados · Etiqueta", type: "text", def: "Directorio" },
      { key: "home.teachers.title", label: "Profesionales destacados · Título", type: "rich", def: "Profesionales *destacados*", help: RICH_HELP },
      { key: "home.teachers.desc", label: "Profesionales destacados · Descripción", type: "textarea", def: "Descubrí profes en tu zona. Leé reseñas y reservá tu próxima sesión." },
      { key: "home.cta.eyebrow", label: "Llamado final · Etiqueta", type: "text", def: "Unite" },
      { key: "home.cta.title", label: "Llamado final · Título", type: "rich", def: "¿Sos profe de yoga\n*o tenés un estudio?*", help: RICH_HELP + " El salto de línea se respeta." },
      { key: "home.cta.desc", label: "Llamado final · Texto", type: "textarea", def: "Sumate a Omia y creá tu landing page profesional hoy mismo. Conectá directamente con alumnos sin intermediarios." },
      { key: "home.cta.button", label: "Llamado final · Botón", type: "text", def: "Crear mi Perfil" },
    ],
  },
  {
    id: "plans",
    title: "Planes y membresías",
    description: "Nombres, descripciones y beneficios de cada plan. Los precios se cambian en Configuración (afectan también el cobro).",
    path: "/para-profes",
    fields: [
      { key: "home.plans.eyebrow", label: "Sección de planes · Etiqueta", type: "text", def: "Membresías" },
      { key: "home.plans.title", label: "Sección de planes · Título", type: "rich", def: "Para Profesores\n*e Institutos*", help: RICH_HELP },
      { key: "home.plans.desc", label: "Sección de planes · Descripción", type: "textarea", def: "Cobrá el 100% del valor de tus clases directamente a tus alumnos sin comisiones. Solamente pagás la pauta mensual para figurar en la plataforma." },
      { key: "plan.inicial.name", label: "Plan Inicial · Nombre", type: "text", def: "Plan Inicial" },
      { key: "plan.inicial.desc", label: "Plan Inicial · Descripción", type: "text", def: "Para profesores independientes que recién comienzan." },
      { key: "plan.inicial.features", label: "Plan Inicial · Beneficios (uno por línea)", type: "list", def: ["Landing page con URL propia", "Aparecer en búsquedas de zona", "1 foto de perfil", "Cobros 100% directos"] },
      { key: "plan.inicial.cta", label: "Plan Inicial · Botón", type: "text", def: "Elegir Inicial" },
      { key: "plan.destacado.name", label: "Plan Destacado · Nombre", type: "text", def: "Plan Destacado" },
      { key: "plan.destacado.badge", label: "Plan Destacado · Cinta", type: "text", def: "Más popular", help: "Vacío = sin cinta." },
      { key: "plan.destacado.desc", label: "Plan Destacado · Descripción", type: "text", def: "Para instructores que buscan prioridad y estadísticas." },
      { key: "plan.destacado.features", label: "Plan Destacado · Beneficios (uno por línea)", type: "list", def: ["Todo lo del Plan Inicial", "Insignia Pro dorada", "Prioridad en IA (Chatbot)", "Dashboard con estadísticas", "Hasta 5 fotos en galería"] },
      { key: "plan.destacado.cta", label: "Plan Destacado · Botón", type: "text", def: "Suscribirme Pro" },
      { key: "plan.institucional.name", label: "Plan Institutos · Nombre", type: "text", def: "Plan Institutos" },
      { key: "plan.institucional.desc", label: "Plan Institutos · Descripción", type: "text", def: "Para centros, estudios de yoga y escuelas." },
      { key: "plan.institucional.features", label: "Plan Institutos · Beneficios (uno por línea)", type: "list", def: ["Todo lo del Plan Destacado", "Múltiples profes asociados", "Sección destacada en mapa", "IA entrenada con tus horarios", "Soporte por mail y WhatsApp"] },
      { key: "plan.institucional.cta", label: "Plan Institutos · Botón", type: "text", def: "Elegir Institutos" },
    ],
  },
  {
    id: "teachers-page",
    title: "Página «Para profes»",
    description: "La página donde los profesionales conocen la propuesta y se suscriben.",
    path: "/para-profes",
    fields: [
      { key: "para.hero.eyebrow", label: "Etiqueta", type: "text", def: "Unite a la red de Omia" },
      { key: "para.hero.title", label: "Título", type: "text", def: "Conectá con más alumnos y multiplicá tu práctica." },
      { key: "para.hero.subtitle", label: "Subtítulo", type: "textarea", def: "Creamos el espacio digital más moderno, orgánico y recomendado por inteligencia artificial para instructores independientes de yoga en la Argentina." },
      {
        key: "para.benefits", label: "Tres beneficios", type: "pairs", pairLabels: ["Título", "Descripción"],
        def: [
          { a: "Recomendación Inteligente", b: "Nuestra guía con IA recomienda activamente tu perfil, horarios y especialidad a los usuarios que buscan de forma natural (ej: \"clases de yoga cerca de Belgrano\")." },
          { a: "Suscripción con Mercado Pago", b: "Pagás tu plan mes a mes con Mercado Pago, con débito automático en pesos. Los alumnos te contactan directo y vos cobrás tus clases como siempre, sin intermediarios." },
          { a: "Estadísticas y Reseñas", b: "Visualizá el alcance de tu perfil, recopilá calificaciones de cinco estrellas firmadas de forma transparente y ganá confianza dentro de la comunidad." },
        ] as Pair[],
      },
      { key: "para.plan.eyebrow", label: "Membresía · Etiqueta", type: "text", def: "Plan para Instructores" },
      { key: "para.plan.title", label: "Membresía · Título", type: "text", def: "Omia Pro Membership" },
      { key: "para.plan.desc", label: "Membresía · Descripción", type: "textarea", def: "Súmate al único plan diseñado para dar visibilidad total a tu agenda. Sin contratos forzosos. Cancelás en cualquier momento con un clic en tu panel." },
      { key: "para.plan.features", label: "Membresía · Beneficios (uno por línea)", type: "list", def: ["Exposición destacada en la grilla y mapa de instructores.", "Prioridad absoluta de recomendación en la IA conversacional.", "Solicitudes de clase y consultas ilimitadas, directo a tu mail.", "Insignia Pro y optimización SEO de tu página personal."] },
      { key: "para.plan.secure", label: "Membresía · Aviso de seguridad", type: "text", def: "Cobros gestionados en pesos argentinos mediante pasarela segura." },
      { key: "para.plan.button", label: "Membresía · Botón", type: "text", def: "Unirme a Omia Pro" },
      { key: "para.plan.footnote", label: "Membresía · Nota bajo el botón", type: "text", def: "Sin permanencia: te das de baja cuando quieras desde tu panel." },
      {
        key: "para.faq", label: "Preguntas frecuentes", type: "pairs", pairLabels: ["Pregunta", "Respuesta"],
        def: [
          { a: "¿Necesito una cuenta especial de Mercado Pago?", b: "No. Para pagar tu membresía podés usar cualquier cuenta de Mercado Pago o tarjeta bancaria. El cobro se renueva solo cada mes y te podés dar de baja cuando quieras desde tu panel." },
          { a: "¿Hay costos extras o comisiones por clases vendidas?", b: "Omia no cobra ninguna comisión sobre tus clases. Los alumnos te contactan por WhatsApp, mail o Instagram y arreglan el pago directamente con vos: el 100% es tuyo." },
        ] as Pair[],
      },
    ],
  },
  {
    id: "directory",
    title: "Directorio, estudios y ranking",
    description: "Títulos y textos de las páginas de búsqueda.",
    path: "/directorio",
    fields: [
      { key: "directory.title", label: "Directorio · Título", type: "text", def: "Directorio de Profesionales e Instructores" },
      { key: "directory.subtitle", label: "Directorio · Texto", type: "textarea", def: "Encontrá a los mejores instructores de Yoga & Pilates en tu ciudad. Filtrá por disciplina, zona o usá nuestra búsqueda inteligente por IA." },
      { key: "studios.eyebrow", label: "Estudios · Etiqueta", type: "text", def: "Estudios e Institutos Afiliados" },
      { key: "studios.title", label: "Estudios · Título", type: "text", def: "Estudios e Institutos de Yoga & Pilates" },
      { key: "studios.subtitle", label: "Estudios · Texto", type: "textarea", def: "Descubrí los espacios de práctica más hermosos, cálidos y mejor equipados de Buenos Aires." },
      { key: "ranking.title", label: "Ranking · Título", type: "text", def: "Ranking de profesionales" },
      { key: "ranking.subtitle", label: "Ranking · Texto", type: "textarea", def: "Los mejor puntuados por quienes tomaron sus clases. El orden combina el puntaje con la cantidad de reseñas." },
    ],
  },
  {
    id: "shop",
    title: "Tienda",
    description: "Encabezado y beneficios de la tienda. Los productos se administran en la sección Productos.",
    path: "/tienda",
    fields: [
      { key: "shop.eyebrow", label: "Etiqueta", type: "text", def: "Tienda Oficial Omia" },
      { key: "shop.title", label: "Título", type: "rich", def: "Equipamiento para *Yoga & Pilates*", help: RICH_HELP },
      { key: "shop.subtitle", label: "Texto", type: "textarea", def: "Mats profesionales, accesorios ergonómicos para Reformer y Mat, bloques sustentables de corcho e indumentaria de compresión diseñados para acompañar tu transformación." },
      {
        key: "shop.badges", label: "Tres beneficios bajo el título", type: "pairs", pairLabels: ["Título", "Descripción"],
        def: [
          { a: "Envíos a todo el país", b: "Despacho en 24hs con código de seguimiento." },
          { a: "Garantía Omia 30 Días", b: "Calidad asegurada y cambios sin complicaciones." },
          { a: "3 Cuotas Sin Interés", b: "Con Mercado Pago o tarjeta de crédito." },
        ] as Pair[],
      },
    ],
  },
  {
    id: "seo",
    title: "Google y redes (SEO)",
    description: "Título y descripción con que cada página aparece en Google y al compartirla por WhatsApp o Instagram. Los cambios se ven en el sitio al instante; en las vistas previas de redes, tras el próximo deploy.",
    path: "/",
    fields: [
      { key: "seo.image", label: "Imagen para compartir en redes", type: "image", def: "/images/yoga_hero_1779994397642.png", help: "Ideal 1200×630 px." },
      { key: "seo.home.title", label: "Portada · Título", type: "text", def: "Omia - Profesores, Institutos y Tienda de Yoga & Pilates" },
      { key: "seo.home.description", label: "Portada · Descripción", type: "textarea", def: "Encontrá los mejores profesores, instructores e institutos de Yoga y Pilates (Reformer, Mat, Barre) en Buenos Aires. Leé opiniones reales, reservá clases y equipate en nuestra tienda oficial." },
      { key: "seo.directory.title", label: "Directorio · Título", type: "text", def: "Directorio de Profesores de Yoga y Pilates en Buenos Aires" },
      { key: "seo.directory.description", label: "Directorio · Descripción", type: "textarea", def: "Buscá profesores de yoga y pilates por barrio, disciplina y precio. Leé reseñas de alumnos y contactalos directo, sin comisiones." },
      { key: "seo.studios.title", label: "Estudios · Título", type: "text", def: "Estudios e institutos de yoga y pilates en Buenos Aires" },
      { key: "seo.studios.description", label: "Estudios · Descripción", type: "textarea", def: "Descubrí estudios e institutos de yoga y pilates (Reformer, Mat, Barre) en Palermo, Belgrano, Recoleta y más. Horarios, precios y reseñas." },
      { key: "seo.ranking.title", label: "Ranking · Título", type: "text", def: "Ranking de profesores e institutos" },
      { key: "seo.ranking.description", label: "Ranking · Descripción", type: "textarea", def: "Los profesores e institutos de yoga y pilates mejor valorados por sus alumnos en Argentina." },
      { key: "seo.shop.title", label: "Tienda · Título", type: "text", def: "Tienda de yoga y pilates: mats, accesorios y más" },
      { key: "seo.shop.description", label: "Tienda · Descripción", type: "textarea", def: "Equipamiento para tu práctica: mats, bloques, aros de pilates, bandas y más, con envío a todo el país." },
      { key: "seo.teachers.title", label: "Para profes · Título", type: "text", def: "Para profesores e institutos: publicá tus clases" },
      { key: "seo.teachers.description", label: "Para profes · Descripción", type: "textarea", def: "Creá tu ficha en Omia, aparecé en las búsquedas de tu zona y recibí alumnos sin comisiones por clase. Planes mensuales sin permanencia." },
      { key: "seo.news.title", label: "Noticias · Título", type: "text", def: "Noticias de yoga y pilates" },
      { key: "seo.news.description", label: "Noticias · Descripción", type: "textarea", def: "Novedades, consejos y notas sobre yoga, pilates y bienestar en Argentina." },
    ],
  },
  {
    id: "legal",
    title: "Textos legales y «Nosotros»",
    description: "Para reemplazar por completo el texto de cada página, escribilo acá en formato Markdown (## títulos, **negrita**, listas con -). Si lo dejás vacío se usa el texto original.",
    path: "/terminos",
    fields: [
      { key: "legal.terms.body", label: "Términos y condiciones (reemplazo completo)", type: "markdown", def: "", help: "Vacío = texto original del sitio." },
      { key: "legal.privacy.body", label: "Política de privacidad (reemplazo completo)", type: "markdown", def: "", help: "Vacío = texto original del sitio." },
      { key: "about.body", label: "Nosotros (reemplazo completo)", type: "markdown", def: "", help: "Vacío = texto original del sitio." },
    ],
  },
];

export const FIELDS: Record<string, Field> = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f])));
export const DEFAULTS: Record<string, Value> = Object.fromEntries(Object.values(FIELDS).map((f) => [f.key, f.def]));

// Solo se aceptan enlaces http(s) o internos: nunca javascript: ni data:.
export const safeHref = (value: string): string | null => {
  const v = (value || "").trim();
  if (!v) return null;
  return /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(v) ? v : null;
};
