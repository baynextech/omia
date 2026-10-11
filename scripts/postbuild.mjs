// Después de `vite build`: genera el sitemap con lo publicado y una copia de index.html por ruta
// con su título, descripción y vista previa (Google, WhatsApp e Instagram leen esas etiquetas
// sin ejecutar el sitio). Si la API no responde, se arman solo las páginas fijas y se avisa.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://omia.site").replace(/\/$/, "");
const API = (process.env.VITE_API_URL || "").replace(/\/$/, "");
const DEFAULT_IMG = `${SITE}/images/yoga_hero_1779994397642.png`;

if (!existsSync(path.join(DIST, "index.html"))) {
  console.log("[postbuild] No hay dist/index.html; nada que hacer.");
  process.exit(0);
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s, n = 160) => (String(s || "").length > n ? `${String(s).slice(0, n - 1).trim()}…` : String(s || ""));

const STATIC = [
  { path: "/directorio", title: "Directorio de profesores de yoga y pilates en Buenos Aires", description: "Buscá profesores de yoga y pilates por barrio, disciplina y precio. Leé reseñas de alumnos y contactalos directo, sin comisiones." },
  { path: "/estudios", title: "Estudios e institutos de yoga y pilates en Buenos Aires", description: "Descubrí estudios e institutos de yoga y pilates (Reformer, Mat, Barre) en Palermo, Belgrano, Recoleta y más. Horarios, precios y reseñas." },
  { path: "/ranking", title: "Ranking de profesores e institutos", description: "Los profesores e institutos de yoga y pilates mejor valorados por sus alumnos en Argentina." },
  { path: "/tienda", title: "Tienda de yoga y pilates: mats, accesorios y más", description: "Equipamiento para tu práctica: mats, bloques, aros de pilates, bandas y más, con envío a todo el país." },
  { path: "/para-profes", title: "Para profesores e institutos: publicá tus clases", description: "Creá tu ficha en Omia, aparecé en las búsquedas de tu zona y recibí alumnos sin comisiones por clase. Planes mensuales sin permanencia." },
  { path: "/noticias", title: "Noticias de yoga y pilates", description: "Novedades, consejos y notas sobre yoga, pilates y bienestar en Argentina." },
  { path: "/nosotros", title: "Nosotros", description: "Omia conecta a alumnos con profesores e institutos de yoga y pilates en Argentina, sin comisiones por clase." },
  { path: "/contacto", title: "Contacto", description: "Escribinos para consultas, para darte de baja o ejercer tus derechos sobre tus datos." },
  { path: "/terminos", title: "Términos y condiciones", description: "Condiciones de uso de Omia: directorio, planes para profesionales y tienda." },
  { path: "/privacidad", title: "Política de privacidad", description: "Cómo Omia trata tus datos personales y cómo ejercer tus derechos." },
  { path: "/arrepentimiento", title: "Botón de arrepentimiento", description: "Revocá una compra o una contratación dentro de los 10 días corridos." },
];

async function getJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const template = await readFile(path.join(DIST, "index.html"), "utf8");

function page({ route, title, description, image, type = "website", noindex = false }) {
  const fullTitle = `${title} | Omia Yoga & Pilates`;
  const url = `${SITE}${route}`;
  let html = template;
  const swap = (re, to) => { html = html.replace(re, to); };
  swap(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  swap(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  swap(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(fullTitle)}$2`);
  swap(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  swap(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`);
  swap(/(<meta property="og:type" content=")[^"]*(")/, `$1${type}$2`);
  swap(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image || DEFAULT_IMG)}$2`);
  swap(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(fullTitle)}$2`);
  swap(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`);
  swap(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image || DEFAULT_IMG)}$2`);
  swap(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`);
  if (noindex) swap(/(<meta name="robots" content=")[^"]*(")/, `$1noindex, nofollow$2`);
  return html;
}

async function write(route, html) {
  const dir = path.join(DIST, route.replace(/^\//, ""));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
}

let count = 0;
for (const p of STATIC) {
  await write(p.path, page({ route: p.path, ...p }));
  count++;
}

const sitemap = [{ loc: `${SITE}/` }, ...STATIC.filter((p) => p.path !== "/arrepentimiento").map((p) => ({ loc: `${SITE}${p.path}` }))];

if (API) {
  const [listings, articles] = await Promise.all([getJson(`${API}/api/teachers`), getJson(`${API}/api/articles?limit=50`)]);
  const institutes = await getJson(`${API}/api/institutes`);
  if (!listings && !articles) console.warn(`[postbuild] No se pudo leer ${API}: se omiten fichas y notas.`);

  for (const t of [...(listings || []), ...(institutes || [])]) {
    const route = `/profesor/${t.id}`;
    const where = t.location ? ` en ${t.location}` : "";
    const title = `${t.name}${t.specialty ? ` — ${t.specialty}` : ""}${where}`;
    const description = clip(t.bio || `${t.name}: ${t.discipline || "yoga y pilates"}${where}. Mirá horarios, precio y reseñas en Omia.`);
    await write(route, page({ route, title, description, image: t.images?.[0]?.startsWith("http") ? t.images[0] : undefined }));
    sitemap.push({ loc: `${SITE}${route}` });
    count++;
  }
  for (const a of articles || []) {
    const route = `/noticias/${a.slug}`;
    await write(route, page({ route, title: a.title, description: clip(a.excerpt || a.title), image: a.image?.startsWith("http") ? a.image : undefined, type: "article" }));
    sitemap.push({ loc: `${SITE}${route}`, lastmod: String(a.published_at || "").slice(0, 10) });
    count++;
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemap.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n") + `\n</urlset>\n`;
await writeFile(path.join(DIST, "sitemap.xml"), xml);
console.log(`[postbuild] ${count} páginas con sus etiquetas y sitemap con ${sitemap.length} direcciones (${SITE}).`);
