// Carga una Omia "casi real" en la base LOCAL: 50 fichas (profesores e institutos), 100 alumnos,
// 30% de las fichas con plan mensual pagado, reseñas, solicitudes, pedidos de la tienda e historial de cobros.
// Todo pasa por la API real, así que se disparan los mails reales (bienvenida, plan activo, pago, etc.)
// y se ven en http://localhost:4100/dev/mailbox.
//
// SOLO LOCAL. Uso:  sh scripts/sim/start-local.sh   (RESET=1 para empezar de cero)
//                   node scripts/sim/seed-realista.mjs [--seed 11]
// Quién paga: el profesor o instituto (membresía mensual). Los alumnos no pagan membresía: solo compran en la tienda.
import pg from "pg";

const API = (process.env.API || "http://localhost:4100").replace(/\/$/, "");
const DB = process.env.DATABASE_URL || "postgres://localhost:5432/omia_sim";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API) || !/@?(localhost|127\.0\.0\.1)[:/]/.test(DB) || !/omia_sim/.test(DB)) {
  console.error("✖ Solo corre contra la API local y la base omia_sim."); process.exit(1);
}
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@sim.test", password: process.env.ADMIN_PASSWORD || "sim-admin-local-1234" };
const PASSWORD = "omia-demo-1234";

let s = +arg("seed", 11) >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const shuffle = (a) => a.map((x) => [rnd(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const strip = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

let ipN = 0;
async function call(token, p, { body, method, expect } = {}) {
  const res = await fetch(API + p, {
    method: method || (body ? "POST" : "GET"),
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), "X-Forwarded-For": `10.${(++ipN >> 16) & 255}.${(ipN >> 8) & 255}.${ipN & 255}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const okc = expect ? [].concat(expect) : [200, 201];
  if (!okc.includes(res.status)) throw new Error(`${p} → ${res.status} ${data.error || ""}`);
  return data;
}

// ── Datos ───────────────────────────────────────────────────────────────────
const NOM_F = ["Lucía", "Camila", "Valentina", "Sofía", "Agustina", "Julieta", "Carolina", "Florencia", "Martina", "Paula", "Romina", "Natalia", "Micaela", "Daniela", "Candela", "Milagros", "Antonella", "Belén", "Rocío", "Ailén"];
const NOM_M = ["Martín", "Joaquín", "Santiago", "Tomás", "Nicolás", "Facundo", "Bruno", "Mateo", "Lucas", "Ignacio", "Franco", "Gonzalo", "Matías", "Federico", "Emiliano", "Ramiro"];
const APE = ["Méndez", "Rossi", "Fernández", "Gómez", "Paz", "Ledesma", "Ibarra", "Suárez", "Acosta", "Molina", "Benítez", "Ferrari", "Romero", "Díaz", "Sosa", "Villalba", "Herrera", "Castro", "Ortiz", "Navarro", "Peralta", "Quiroga", "Aguirre", "Domínguez", "Bianchi", "Giménez", "Rivas", "Cabrera"];
const ZONAS = ["Palermo", "Belgrano", "Recoleta", "Villa Crespo", "Caballito", "Núñez", "San Telmo", "Almagro", "Colegiales", "Villa Urquiza", "Barracas", "Flores", "Vicente López", "San Isidro", "Olivos", "Martínez"];
const YOGA = ["Hatha Yoga", "Vinyasa Flow", "Yoga restaurativo", "Yin Yoga", "Ashtanga", "Yoga prenatal", "Kundalini", "Yoga para espalda"];
const PIL = ["Pilates Reformer", "Pilates Mat", "Pilates terapéutico", "Pilates en suelo", "Pilates para embarazadas"];
const INST_A = ["Prana", "Sattva", "Asana", "Atma", "Shanti", "Ananda", "Namasté", "Lotus", "Mandala", "Equilibrio", "Core", "Alma", "Pura Vida", "Raíz", "Luna"];
const INST_B = ["Estudio", "Espacio", "Centro", "Casa", "Studio"];
const IMGS = ["photo-1518611012118-696072aa579a", "photo-1506126613408-eca07ce68773", "photo-1599447421416-3414500d18a5", "photo-1518241353330-0f7941c2d9b5", "photo-1608571423902-eed4a5ad8108", "photo-1588286840104-8957b019727f", "photo-1545205597-3d9d02c29597", "photo-1544367567-0f2fcb009e0b", "photo-1518310383802-640c2de311b2"]
  .map((id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=800`);
const BIO_P = [
  (n, e, z, y) => `Instructor/a de ${e} con ${y} años de experiencia en ${z}. Clases individuales y en grupos reducidos, siempre adaptadas a cada cuerpo y a cada momento.`,
  (n, e, z, y) => `Hola, soy ${n.split(" ")[0]}. Enseño ${e} hace ${y} años. Mi enfoque es simple: respirar, moverse con atención y volver a casa más tranquilo/a. Clases en ${z} y online.`,
  (n, e, z, y) => `Profesor/a de ${e} formado/a en Buenos Aires. Trabajo con principiantes y con quienes vuelven después de una lesión. Atiendo en ${z}.`,
  (n, e, z, y) => `${e} para todos los niveles. Más de ${y} años acompañando a personas que buscan bajar el estrés y ganar movilidad. Zona ${z}.`,
];
const BIO_I = [
  (n, z) => `${n} es un espacio dedicado al movimiento consciente en ${z}. Clases grupales y privadas, salas luminosas y equipo propio de instructores certificados.`,
  (n, z) => `En ${n} ofrecemos yoga y pilates para todos los niveles. Grupos reducidos, equipos de Reformer y un ambiente cálido en ${z}.`,
];
const RESENAS = {
  5: ["Excelente clase, súper clara y con muy buena energía. Ya reservé la próxima.", "Me encantó. Se nota la experiencia y cómo cuida cada detalle de la postura.", "Volví a moverme sin dolor de espalda después de 3 semanas. Recomiendo totalmente.", "Un lugar hermoso y una atención muy cálida. Salí renovada.", "Muy profesional y paciente. Ideal si estás empezando de cero.", "La mejor clase de la semana, no me la pierdo más."],
  4: ["Muy buena clase. Lo único, que el horario que quería ya estaba tomado.", "Buen ambiente y buena explicación. Volvería.", "Me gustó mucho, aunque el grupo era un poco grande.", "Recomendable, buena atención y puntualidad."],
  3: ["Estuvo bien, esperaba algo más personalizado.", "Correcta, pero me costó coordinar el horario."],
  2: ["No era lo que esperaba, la clase fue muy rápida para mi nivel."],
};
const PEDIDO_CIUDADES = [["Av. Cabildo 2150", "CABA", "Buenos Aires", "1428"], ["Gorriti 4800", "CABA", "Buenos Aires", "1414"], ["Libertador 1900", "Vicente López", "Buenos Aires", "1638"], ["Corrientes 3200", "CABA", "Buenos Aires", "1193"]];

const nombreP = () => `${chance(0.62) ? pick(NOM_F) : pick(NOM_M)} ${pick(APE)}`;
const usados = new Set();
const unico = (fn) => { for (let i = 0; i < 50; i++) { const n = fn(); if (!usados.has(n)) { usados.add(n); return n; } } return fn(); };

const t0 = Date.now();
console.log("▸ Entrando como admin…");
const admin = (await call(null, "/api/auth/login", { body: ADMIN })).token;

// ── 1) Fichas: 15 con cuenta propia que PAGAN (30%) + 35 cargadas por el equipo ──
const plans = [];
function ficha(esInstituto) {
  const zona = pick(ZONAS);
  const disc = chance(0.5) ? "Yoga" : "Pilates";
  const esp = pick(disc === "Yoga" ? YOGA : PIL);
  const nombre = esInstituto ? unico(() => `${pick(INST_B)} ${pick(INST_A)}`) : unico(nombreP);
  const anios = int(3, 18);
  return {
    nombre, zona, disc, esp, esInstituto,
    precio: esInstituto ? int(8, 16) * 1000 : int(6, 14) * 1000,
    bio: esInstituto ? pick(BIO_I)(nombre, zona) : pick(BIO_P)(nombre, esp, zona, anios),
    dias: shuffle(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]).slice(0, int(3, 6)),
    imgs: shuffle(IMGS).slice(0, int(2, 4)),
  };
}
const payload = (f, extra = {}) => ({
  name: f.nombre, specialty: f.esp, discipline: f.disc, location: f.zona, price: `$${f.precio.toLocaleString("es-AR")}/clase`, bio: f.bio,
  availableDays: f.dias, image: f.imgs[0], images: f.imgs.slice(1), phone: `11${int(40000000, 69999999)}`, hours: "Lun a Vie 8 a 21 hs",
  instagram: strip(f.nombre).replace(/\./g, "_"), ...(f.esInstituto ? { address: `${pick(["Honduras", "Thames", "Arenales", "Cabildo", "Av. Rivadavia"])} ${int(100, 4900)}`, amenities: shuffle(["Vestuarios", "Reformers", "Salas con luz natural", "Mats incluidos", "Té y descanso"]).slice(0, 3) } : {}), ...extra });

console.log("▸ Profesores e institutos que pagan (15)…");
const payers = [];
const cuentasPagan = [...Array(10).fill(false), ...Array(5).fill(true)];
for (const inst of cuentasPagan) {
  const f = ficha(inst);
  const email = `${strip(f.nombre)}@sim.test`;
  const reg = await call(null, "/api/auth/register", { body: { email, password: PASSWORD, name: f.nombre, role: inst ? "instituto" : "profesor", acceptTerms: true }, expect: 201 });
  const out = await call(reg.token, "/api/teachers/create-or-update", { body: payload(f, { email }) });
  const plan = inst ? "institucional" : pick(["inicial", "destacado", "destacado"]);
  const co = await call(reg.token, "/api/subscriptions/checkout", { body: { plan } });
  const sy = await call(reg.token, "/api/subscriptions/sync", { body: { subscriptionId: co.subscriptionId } });
  payers.push({ ...f, email, token: reg.token, id: out.teacher.id, plan, subId: co.subscriptionId, status: sy.subscription.status });
}
console.log("▸ Fichas cargadas por el equipo (35) y cuentas sin pagar (5)…");
const cargadas = [];
for (let i = 0; i < 35; i++) {
  const f = ficha(i < 10);
  // El admin carga campos de la base tal cual (snake_case): foto principal + galería, tipo y días.
  const t = await call(admin, "/api/admin/teachers", { body: payload(f, { email: `${strip(f.nombre)}@contacto.test`, images: f.imgs, available_days: f.dias, kind: f.esInstituto ? "instituto" : "profesor" }) });
  cargadas.push({ ...f, id: t.id });
}
for (let i = 0; i < 5; i++) { // se registraron, completaron la ficha y todavía no pagaron: quedan pendientes (invisibles)
  const f = ficha(false); const email = `${strip(f.nombre)}@sim.test`;
  const reg = await call(null, "/api/auth/register", { body: { email, password: PASSWORD, name: f.nombre, role: "profesor", acceptTerms: true }, expect: 201 });
  await call(reg.token, "/api/teachers/create-or-update", { body: payload(f, { email }) });
}
const listings = [...payers, ...cargadas];

// ── 2) 100 alumnos ──
console.log("▸ 100 alumnos…");
const alumnos = [];
for (let i = 0; i < 100; i++) {
  const nombre = unico(nombreP); const email = `${strip(nombre)}${i}@sim.test`;
  const reg = await call(null, "/api/auth/register", { body: { email, password: PASSWORD, name: nombre, role: "alumno", acceptTerms: true }, expect: 201 });
  alumnos.push({ nombre, email, token: reg.token });
}

// ── 3) Actividad: favoritos, visitas, solicitudes, reseñas ──
console.log("▸ Actividad de los alumnos (favoritos, solicitudes, reseñas)…");
const productos = (await call(null, "/api/products")).filter((p) => p.inStock);
let nBook = 0, nRev = 0, nOrd = 0, nFav = 0;
// Los más populares reciben más tráfico: pesos decrecientes.
const popular = shuffle(listings);
const elegir = () => popular[Math.min(popular.length - 1, Math.floor(Math.abs(rnd() - rnd()) * popular.length * 1.6))];
for (const a of alumnos) {
  for (let k = 0; k < int(1, 4); k++) {
    const t = elegir();
    await call(a.token, `/api/teachers/${t.id}/visit`, { body: {} });
    if (chance(0.45)) { await call(a.token, `/api/favorites/${t.id}`, { body: {} }); nFav++; }
  }
  if (chance(0.55)) { // pide una clase
    const t = elegir();
    const fecha = new Date(Date.now() + int(1, 21) * 86400000).toISOString().slice(0, 10);
    await call(a.token, "/api/bookings", { body: { teacherId: t.id, date: fecha, time: pick(["09:00", "10:30", "12:00", "18:00", "19:30"]) }, expect: 201 }); nBook++;
    if (chance(0.7)) { // reseña
      const r = chance(0.62) ? 5 : chance(0.6) ? 4 : chance(0.6) ? 3 : 2;
      const rv = await call(a.token, `/api/teachers/${t.id}/reviews`, { body: { rating: r, comment: pick(RESENAS[r]) } }); nRev++;
      const owner = payers.find((p) => p.id === t.id);
      if (owner && chance(0.6)) await call(owner.token, `/api/reviews/${rv.review.id}/reply`, { body: { reply: r >= 4 ? "¡Gracias por tu comentario! Te espero en la próxima." : "Gracias por contarlo, lo tomo en cuenta. Escribime y lo vemos." } });
    }
  }
  if (chance(0.28) && productos.length) { // compra en la tienda con pago simulado
    const p = pick(productos); const c = pick(PEDIDO_CIUDADES); const envio = chance(0.65);
    const tx = await call(a.token, "/api/payments/mercadopago", { body: { type: "shop_order", items: [{ id: p.id, quantity: int(1, 2) }], shipping: { name: a.nombre, phone: `11${int(40000000, 69999999)}`, address: c[0], city: c[1], province: c[2], zip: c[3], method: envio ? "envio" : "retiro" } } });
    await call(a.token, "/api/payments/confirm", { body: { tx: tx.transactionId } }); nOrd++;
  }
}

// ── 4) Pasa el tiempo: cobros de los meses siguientes, fallos, bajas y vencimientos ──
console.log("▸ Historial de cobros y casos especiales…");
const [, ...rest] = [null, ...payers];
const casos = { fail: payers.slice(0, 2), cancel: payers.slice(2, 3), expire: payers.slice(3, 4), ok: payers.slice(4) };
for (const [outcome, grupo] of Object.entries(casos)) for (const p of grupo) await call(null, `/api/dev/subscriptions/${p.subId}/renew`, { body: { outcome } });

// Fechas escalonadas (altas de los últimos 90 días, cobros de los 2 meses previos) para que los gráficos del admin tengan forma.
const db = new pg.Client({ connectionString: DB }); await db.connect();
await db.query(`UPDATE users SET created_at = NOW() - (random() * interval '90 days') WHERE email LIKE '%@sim.test'`);
await db.query(`UPDATE teachers SET created_at = NOW() - (random() * interval '90 days')`);
for (const p of payers) {
  const u = (await db.query("SELECT user_id, amount FROM subscriptions WHERE id = $1", [p.subId])).rows[0];
  const name = (await db.query("SELECT name FROM users WHERE id = $1", [u.user_id])).rows[0].name;
  for (const meses of [2, 1]) {
    if (p.status === "activa" && chance(0.85)) {
      await db.query(
        `INSERT INTO transactions (user_id, user_name, type, amount, description, item_id, mp_payment_id, status, subscription_id, created_at, updated_at)
         VALUES ($1,$2,'subscription',$3,$4,$5,$6,'aprobado',$7, NOW() - ($8 || ' days')::interval, NOW() - ($8 || ' days')::interval)`,
        [u.user_id, name, u.amount, `Membresía Omia - ${p.plan} (mensual)`, p.plan, `hist-${p.subId.slice(0, 8)}-${meses}`, p.subId, String(meses * 30 + int(0, 3))]);
    }
  }
}
await db.query(`UPDATE transactions SET created_at = NOW() - (random() * interval '60 days'), updated_at = created_at WHERE type = 'product'`);
await db.end();

const mails = await fetch(`${API}/dev/mailbox`).then((r) => r.text()).then((t) => (t.match(/<li>/g) || []).length).catch(() => "?");
console.log(`
✔ Listo en ${((Date.now() - t0) / 1000).toFixed(0)} s
  Fichas visibles: ${listings.length} (15 con plan pago, 35 cargadas por el equipo) + 5 pendientes sin pagar (no se ven)
  Alumnos: ${alumnos.length} · favoritos ${nFav} · solicitudes ${nBook} · reseñas ${nRev} · pedidos ${nOrd}
  Mails en la bandeja: ~${mails}  →  ${API}/dev/mailbox
  Contraseña de todas las cuentas: ${PASSWORD}
  Profesor de ejemplo: ${payers[4].email}   Instituto: ${payers.find((p) => p.esInstituto).email}   Alumno: ${alumnos[0].email}
  Admin: ${ADMIN.email} / ${ADMIN.password}`);
