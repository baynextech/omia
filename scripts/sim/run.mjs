// Simulación de usuarios de Omia: instructores y alumnos "agentes" que usan la API real, pagan en el
// simulador, dialogan entre sí y dejan un informe de lo que funcionó y de lo que se rompió.
//
// SOLO LOCAL. Se niega a correr contra cualquier API que no sea localhost.
// Uso:  sh scripts/sim/start-local.sh            (en otra terminal)
//       GEMINI_API_KEY=... node scripts/sim/run.mjs [--instructores 5] [--alumnos 12] [--rondas 2] [--seed 7]
// Sin GEMINI_API_KEY los textos salen de plantillas (los flujos son los mismos).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const API = (process.env.API || "http://localhost:4100").replace(/\/$/, "");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API)) {
  console.error(`✖ Esta simulación solo corre contra una API local (recibí ${API}).`);
  process.exit(1);
}
const N_INSTR = +arg("instructores", 5);
const N_ALUM = +arg("alumnos", 12);
const ROUNDS = +arg("rondas", 2);
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@sim.test", password: process.env.ADMIN_PASSWORD || "sim-admin-local-1234" };
const KEY = process.env.GEMINI_API_KEY || "";
const MODELS = (process.env.SIM_MODELS || "gemini-2.5-flash,gemini-2.5-flash-lite").split(",");
const RUN = Date.now().toString(36);
const PASSWORD = "simulacion-12345";

// ── Azar reproducible ───────────────────────────────────────────────────────
let s = +arg("seed", Date.now() % 100000) >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const chance = (p) => rnd() < p;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Registro de eventos y hallazgos ─────────────────────────────────────────
const log = [];            // línea de tiempo
const dialogues = [];      // conversaciones entre agentes
const findings = [];       // cosas raras o rotas
const stats = { calls: 0, ok: 0, llm: 0, llmFallback: 0 };
const say = (who, what) => { log.push(`- **${who}** ${what}`); };
const finding = (sev, text) => { findings.push({ sev, text }); console.log(`  ⚠ [${sev}] ${text}`); };

let ipCounter = 0;
async function call(agent, p, { method, body, expect } = {}) {
  stats.calls++;
  const m = method || (body ? "POST" : "GET");
  const res = await fetch(API + p, {
    method: m,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(agent?.token ? { Authorization: `Bearer ${agent.token}` } : {}),
      // Cada agente es "una persona distinta": el servidor limita por IP, así que cada uno manda la suya.
      "X-Forwarded-For": agent?.ip || "10.0.0.1",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const wanted = expect ? [].concat(expect) : [200, 201];
  if (wanted.includes(res.status)) stats.ok++;
  else if (res.status >= 500) finding("alta", `${m} ${p} → ${res.status} (error del servidor) ${data.error || ""}`.trim());
  return { status: res.status, ok: wanted.includes(res.status), data };
}

// ── "Cerebro" de los agentes: Gemini o plantillas ───────────────────────────
async function think(system, prompt, fallback) {
  if (!KEY) { stats.llmFallback++; return fallback(); }
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
      if (t) { stats.llm++; return t.replace(/^["“]|["”]$/g, ""); }
    } catch { /* prueba el siguiente modelo */ }
  }
  stats.llmFallback++;
  return fallback();
}

// ── Personas ────────────────────────────────────────────────────────────────
const NOMBRES = ["Lucía", "Martín", "Camila", "Joaquín", "Valentina", "Santiago", "Sofía", "Tomás", "Agustina", "Nicolás", "Julieta", "Facundo", "Carolina", "Bruno", "Florencia", "Mateo"];
const APELLIDOS = ["Méndez", "Rossi", "Fernández", "Gómez", "Paz", "Ledesma", "Ibarra", "Suárez", "Acosta", "Molina", "Benítez", "Ferrari"];
const ZONAS = ["Palermo", "Belgrano", "Recoleta", "Villa Crespo", "Caballito", "Núñez", "San Telmo", "Almagro"];
const DISCIPLINAS = [
  { d: "Yoga", s: ["Hatha Yoga", "Vinyasa", "Yoga restaurativo", "Yin Yoga"] },
  { d: "Pilates", s: ["Pilates Reformer", "Pilates Mat", "Pilates terapéutico"] },
];
const PLANES = ["inicial", "destacado"];
const OBJETIVOS = ["bajar el estrés", "mejorar la espalda", "ganar flexibilidad", "prepararme para el parto", "recuperarme de una lesión", "empezar de cero", "sumar fuerza", "dormir mejor"];

function persona(i, kind) {
  const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
  return { i, kind, nombre, email: `${kind}${i}-${RUN}@sim.test`, ip: `10.${kind === "instr" ? 1 : 2}.${Math.floor(i / 250)}.${(i % 250) + 1}` };
}

const instr = Array.from({ length: N_INSTR }, (_, i) => {
  const a = persona(i, "instr");
  const disc = pick(DISCIPLINAS);
  Object.assign(a, {
    disciplina: disc.d, especialidad: pick(disc.s), zona: pick(ZONAS), precio: 7000 + Math.floor(rnd() * 8) * 1000,
    estilo: pick(["cálida y cercana", "técnica y precisa", "relajada y con humor", "profesional y breve"]),
    plan: pick(PLANES), pagaria: i !== 1, // el segundo instructor no paga: prueba la ficha "pendiente"
    esInstituto: false,
  });
  return a;
});
const alum = Array.from({ length: N_ALUM }, (_, i) => {
  const a = persona(i, "alum");
  Object.assign(a, {
    objetivo: pick(OBJETIVOS), zona: pick(ZONAS), presupuesto: 6000 + Math.floor(rnd() * 8) * 1000,
    caracter: pick(["dudoso y pregunta mucho", "decidido", "exigente con el precio", "amable y expresivo", "directo y escueto"]),
    compra: chance(0.5), deja_resena: chance(0.8),
  });
  return a;
});

// ── Acciones de los instructores ────────────────────────────────────────────
async function altaInstructor(a) {
  const r = await call(a, "/api/auth/register", { body: { email: a.email, password: PASSWORD, name: a.nombre, role: "profesor", acceptTerms: true }, expect: 201 });
  if (!r.ok) return finding("alta", `Registro de ${a.nombre} falló (${r.status}): ${r.data.error}`);
  a.token = r.data.token;

  const bio = await think(
    `Sos ${a.nombre}, instructor/a de ${a.disciplina} en ${a.zona}, Buenos Aires. Tu estilo es ${a.estilo}. Escribís en español rioplatense.`,
    "Escribí la presentación de tu ficha pública en Omia (2 o 3 oraciones, primera persona, sin emojis ni comillas).",
    () => `Soy ${a.nombre}, instructor/a de ${a.especialidad} en ${a.zona}. Doy clases individuales y en grupos reducidos, adaptadas a cada persona.`
  );
  const ficha = await call(a, "/api/teachers/create-or-update", {
    body: {
      name: a.nombre, specialty: a.especialidad, discipline: a.disciplina, location: a.zona, price: `$${a.precio.toLocaleString("es-AR")}/clase`,
      availableDays: ["Lun", "Mié", "Vie"].concat(chance(0.5) ? ["Sáb"] : []), bio,
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600", email: a.email, phone: "1155550000",
    },
  });
  if (!ficha.ok) return finding("alta", `Ficha de ${a.nombre} falló: ${ficha.data.error}`);
  a.teacherId = ficha.data.teacher.id;
  if (ficha.data.teacher.status !== "pendiente") finding("media", `La ficha nueva de ${a.nombre} quedó "${ficha.data.teacher.status}" y debería ser "pendiente" hasta el primer pago.`);
  say(a.nombre, `crea su ficha de ${a.especialidad} en ${a.zona} ($${a.precio}). Estado: ${ficha.data.teacher.status}. _“${bio}”_`);

  if (!a.pagaria) return say(a.nombre, "decide no pagar el plan todavía (control: su ficha no debería verse en el directorio).");
  const co = await call(a, "/api/subscriptions/checkout", { body: { plan: a.plan } });
  if (!co.ok) return finding("alta", `Checkout de ${a.nombre} falló: ${co.data.error}`);
  if (!co.data.isMock) throw new Error("La API no está en modo simulador. Abortando por seguridad.");
  const sync = await call(a, "/api/subscriptions/sync", { body: { subscriptionId: co.data.subscriptionId } });
  a.activo = sync.data.subscription?.status === "activa";
  say(a.nombre, `paga el plan **${a.plan}** en el simulador → suscripción ${sync.data.subscription?.status}.`);
  if (!a.activo) finding("alta", `${a.nombre} pagó y la suscripción no quedó activa.`);
}

// ── Acciones de los alumnos ─────────────────────────────────────────────────
async function altaAlumno(a) {
  const r = await call(a, "/api/auth/register", { body: { email: a.email, password: PASSWORD, name: a.nombre, role: "alumno", acceptTerms: true }, expect: 201 });
  if (!r.ok) return finding("alta", `Registro de ${a.nombre} falló (${r.status}): ${r.data.error}`);
  a.token = r.data.token;
}

// Mensaje del alumno ↔ respuesta del instructor, turnos alternados (la charla que en Omia pasa fuera del sitio).
async function conversar(al, ins, fecha, hora) {
  const turns = [];
  const sysAl = `Sos ${al.nombre}, ${al.caracter}. Querés ${al.objetivo}. Tu presupuesto es de unos $${al.presupuesto} por clase. Escribís en español rioplatense, mensajes cortos tipo WhatsApp, sin emojis.`;
  const sysIn = `Sos ${ins.nombre}, instructor/a de ${ins.especialidad}, estilo ${ins.estilo}. Cobrás $${ins.precio} la clase. Escribís en español rioplatense, mensajes cortos tipo WhatsApp, sin emojis.`;
  const hist = () => turns.map((t) => `${t.de}: ${t.txt}`).join("\n");

  let t = await think(sysAl, `Pedí una clase con ${ins.nombre} para el ${fecha} a las ${hora}. Contale tu objetivo y preguntá lo que te importe. Un solo mensaje.`,
    () => `Hola ${ins.nombre.split(" ")[0]}, quería reservar una clase el ${fecha} a las ${hora}. Mi objetivo es ${al.objetivo}. ¿Tenés lugar?`);
  turns.push({ de: al.nombre, txt: t });
  t = await think(sysIn, `Conversación:\n${hist()}\nRespondé al alumno: confirmá o proponé otro horario y contá cómo se paga. Un solo mensaje.`,
    () => `¡Hola! Sí, tengo lugar. La clase sale $${ins.precio} y se abona directo. Te espero.`);
  turns.push({ de: ins.nombre, txt: t });
  const trato = ins.precio <= al.presupuesto || chance(0.4);
  t = await think(sysAl, `Conversación:\n${hist()}\nRespondé. ${trato ? "Aceptá y confirmá." : "El precio te parece alto: decilo con tu carácter y decidí si seguís."} Un solo mensaje.`,
    () => (trato ? "Perfecto, quedamos así. Gracias." : "Uh, me pasa un poco de mi presupuesto. Lo pienso y te aviso."));
  turns.push({ de: al.nombre, txt: t });
  dialogues.push({ al: al.nombre, ins: ins.nombre, turns, cierra: trato });
  return trato;
}

async function turnoAlumno(al) {
  // 1) Busca en el directorio, como lo haría una persona.
  const zona = chance(0.6) ? `?location=${encodeURIComponent(al.zona)}` : "";
  const dir = await call(al, `/api/teachers${zona}`);
  const lista = Array.isArray(dir.data) ? dir.data : dir.data.teachers || [];
  const pendientes = instr.filter((x) => !x.activo).map((x) => x.teacherId);
  if (lista.some((t) => pendientes.includes(t.id))) finding("alta", "Una ficha sin plan pagado aparece en el directorio público.");
  const candidatos = lista.length ? lista : ((await call(al, "/api/teachers")).data || []);
  const elegido = pick(Array.isArray(candidatos) ? candidatos : []);
  if (!elegido) { say(al.nombre, "busca y no encuentra a nadie en el directorio."); return finding("media", "El directorio está vacío para un alumno."); }
  const ins = instr.find((x) => x.teacherId === elegido.id);
  say(al.nombre, `busca en el directorio${zona ? ` (${al.zona})` : ""} y elige a **${elegido.name}**.`);

  // 2) Pregunta a Omi y mira la ficha.
  const q = await think(`Sos ${al.nombre}, ${al.caracter}. Querés ${al.objetivo}.`, "Escribile una pregunta corta al asistente de un directorio de yoga y pilates. Sin emojis.",
    () => `Busco algo para ${al.objetivo}, ¿qué me recomiendan?`);
  const chat = await call(al, "/api/chat", { body: { message: q } });
  say(al.nombre, `le pregunta a Omi: _“${q}”_ → ${chat.data.reply ? `_“${String(chat.data.reply).slice(0, 140).replace(/\n/g, " ")}…”_` : "sin respuesta"}`);
  await call(al, `/api/teachers/${elegido.id}/visit`, { body: {} });
  if (chance(0.5)) await call(al, `/api/favorites/${elegido.id}`, { body: {} });

  // 3) Charla con el instructor y solicitud de clase.
  const fecha = new Date(Date.now() + (2 + Math.floor(rnd() * 12)) * 86400000).toISOString().slice(0, 10);
  const hora = pick(["09:00", "10:30", "18:00", "19:30"]);
  const acepto = ins ? await conversar(al, ins, fecha, hora) : true;
  let reservo = false;
  if (acepto) {
    const b = await call(al, "/api/bookings", { body: { teacherId: elegido.id, date: fecha, time: hora }, expect: 201 });
    reservo = b.ok;
    say(al.nombre, b.ok ? `solicita clase el ${fecha} ${hora} (estado ${b.data.booking?.status}).` : `la solicitud falló: ${b.data.error}`);
    if (!b.ok && ins?.activo) finding("alta", `Un alumno no pudo reservar con ${elegido.name} (plan activo): ${b.data.error}`);
  } else say(al.nombre, `no cierra con ${elegido.name} por precio.`);

  // 4) Compra en la tienda con pago simulado.
  if (al.compra) await comprar(al);

  // 5) Reseña (sin importar si hubo clase: se mide si la plataforma lo controla).
  if (reservo && al.deja_resena) {
    const rating = chance(0.75) ? 5 : pick([2, 3, 4]);
    const comment = await think(`Sos ${al.nombre}, ${al.caracter}. Tuviste una clase con ${elegido.name}.`,
      `Escribí una reseña de ${rating} sobre 5 estrellas, 1 o 2 oraciones, sin emojis.`, () => (rating >= 4 ? "Muy buena clase, clara y con buen ambiente." : "Estuvo bien, pero esperaba algo más personalizado."));
    const rv = await call(al, `/api/teachers/${elegido.id}/reviews`, { body: { rating, comment } });
    say(al.nombre, `reseña ${"★".repeat(rating)} a ${elegido.name}: _“${comment}”_`);
    if (rv.ok && ins?.token) {
      const rep = await think(`Sos ${ins.nombre}, estilo ${ins.estilo}.`, `Respondé en una oración esta reseña: "${comment}" (${rating}/5). Sin emojis.`, () => "¡Gracias por tu comentario! Te espero en la próxima.");
      const rr = await call(ins, `/api/reviews/${rv.data.review.id}/reply`, { body: { reply: rep } });
      say(ins.nombre, `responde a ${al.nombre}: _“${rep}”_${rr.ok ? "" : " (falló)"}`);
    }
  }
}

let stockCache = null;
async function comprar(al) {
  const prods = (await call(al, "/api/products")).data;
  if (!Array.isArray(prods) || !prods.length) return finding("media", "La tienda no tiene productos; no se pudo comprar.");
  const p = pick(prods.filter((x) => x.inStock) .length ? prods.filter((x) => x.inStock) : prods);
  const cant = 1 + Math.floor(rnd() * 2);
  const envio = chance(0.6);
  const r = await call(al, "/api/payments/mercadopago", {
    body: { type: "shop_order", items: [{ id: p.id, quantity: cant }], shipping: { name: al.nombre, phone: "1166660000", address: "Av. Siempreviva 742", city: "CABA", province: "Buenos Aires", zip: "1414", method: envio ? "envio" : "retiro" } },
  });
  if (!r.ok) return say(al.nombre, `intenta comprar ${p.name} y falla: ${r.data.error}`);
  const ok = await call(al, "/api/payments/confirm", { body: { tx: r.data.transactionId } });
  say(al.nombre, `compra ${cant} × **${p.name}** (${envio ? "envío" : "retiro"}) → pago simulado ${ok.data.status}.`);
  (al.compras ||= []).push({ id: p.id, name: p.name, cant, tx: r.data.transactionId, total: undefined });
  if (ok.data.status !== "approved") finding("alta", `Pago simulado de ${al.nombre} no quedó aprobado (${ok.data.status}).`);
}

// ── Controles de seguridad / coherencia (comportamientos que NO deben pasar) ─
async function controles() {
  const a = alum[0]; const i0 = instr.find((x) => x.activo);
  if (!a || !i0) return;
  const propia = await call(i0, `/api/teachers/${i0.teacherId}/reviews`, { body: { rating: 5, comment: "me autoreseño" }, expect: 403 });
  if (!propia.ok) finding("alta", "Un instructor pudo reseñarse a sí mismo.");
  const propiaB = await call(i0, "/api/bookings", { body: { teacherId: i0.teacherId, date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), time: "10:00" }, expect: 400 });
  if (!propiaB.ok) finding("alta", "Un instructor pudo reservar su propia clase.");
  const ajena = await call(a, "/api/reviews/00000000-0000-4000-8000-000000000000/reply", { body: { reply: "x" }, expect: 404 });
  if (!ajena.ok) finding("alta", "Un alumno pudo responder reseñas ajenas.");
  const admin = await call(a, "/api/admin/dashboard", { expect: [401, 403] });
  if (!admin.ok) finding("alta", "Un alumno accedió al panel de admin.");
  const nuevo = await call(a, "/api/payments/confirm", { body: { tx: "00000000-0000-4000-8000-000000000000" }, expect: [404, 400] });
  if (!nuevo.ok) finding("alta", "Se pudo confirmar un pago inexistente.");
  // Reseña de alguien que nunca reservó con ese instructor:
  const virgen = alum.find((x) => x.token && !x.reservo);
  const ficha = instr.find((x) => x.activo && x.teacherId);
  if (virgen && ficha) {
    const r = await call(virgen, `/api/teachers/${ficha.teacherId}/reviews`, { body: { rating: 1, comment: "control: nunca fui alumno" } });
    if (r.ok) finding("media", "Cualquier usuario registrado puede reseñar a un instructor sin haber pedido nunca una clase (reseñas no verificadas; se pueden usar para inflar o hundir el ranking).");
  }
}

// ── Verificación final contra el panel de admin ─────────────────────────────
async function auditoria() {
  const adm = { ip: "10.9.9.9" };
  const lg = await call(adm, "/api/auth/login", { body: ADMIN });
  if (!lg.ok) return finding("media", "No pude entrar como admin local para auditar (¿ADMIN_PASSWORD?).");
  adm.token = lg.data.token;
  const [dash, tx, subs, bks] = await Promise.all([call(adm, "/api/admin/dashboard"), call(adm, "/api/admin/transactions"), call(adm, "/api/admin/subscriptions"), call(adm, "/api/admin/bookings")]);
  const mias = (arr) => (Array.isArray(arr) ? arr : arr?.items || []).filter((r) => JSON.stringify(r).includes(`-${RUN}@sim.test`) || JSON.stringify(r).includes(RUN));
  const esperadasCompras = alum.flatMap((x) => x.compras || []).length;
  const aprob = (Array.isArray(tx.data) ? tx.data : []).filter((t) => t.status === "aprobado" && t.type === "product" && (t.items || []).length && JSON.stringify(t).includes("")).length;
  const activos = instr.filter((x) => x.activo).length;
  const subsActivas = mias(subs.data).filter((x) => x.status === "activa").length;
  if (subsActivas !== activos) finding("alta", `Suscripciones activas en admin (${subsActivas}) ≠ instructores que pagaron (${activos}).`);
  // Ranking y ratings
  const rk = await call(adm, "/api/ranking");
  return { dashboard: dash.data, compras: esperadasCompras, transaccionesAprobadasProducto: aprob, suscripcionesActivas: subsActivas, reservasEnAdmin: mias(bks.data).length, ranking: (Array.isArray(rk.data) ? rk.data : rk.data.ranking || []).slice(0, 5).map((r) => `${r.name} (${r.rating ?? "–"}, ${r.review_count ?? r.reviewCount ?? 0} reseñas)`) };
}

// ── Orquesta ────────────────────────────────────────────────────────────────
console.log(`Simulación ${RUN} · ${N_INSTR} instructores, ${N_ALUM} alumnos, ${ROUNDS} rondas · cerebro: ${KEY ? "Gemini" : "plantillas (sin GEMINI_API_KEY)"}`);
const health = await fetch(`${API}/api/health`).catch(() => null);
if (!health?.ok) { console.error(`✖ No responde ${API}. Levantá la API con: sh scripts/sim/start-local.sh`); process.exit(1); }

await Promise.all(instr.map(altaInstructor));
await Promise.all(alum.map(altaAlumno));
for (let r = 1; r <= ROUNDS; r++) {
  log.push(`\n### Ronda ${r}`);
  const activos = alum.filter((a) => a.token);
  // Los alumnos actúan en paralelo, en tandas, como usuarios simultáneos.
  for (let k = 0; k < activos.length; k += 4) await Promise.all(activos.slice(k, k + 4).map((a) => turnoAlumno(a).catch((e) => finding("alta", `${a.nombre}: excepción ${e.message}`))));
  await sleep(200);
}
alum.forEach((a) => { a.reservo = log.some((l) => l.includes(`**${a.nombre}** solicita clase`)); });
await controles();
const aud = await auditoria();

// ── Informe ─────────────────────────────────────────────────────────────────
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "out");
await mkdir(out, { recursive: true });
const sev = { alta: "🔴", media: "🟠", baja: "🟡" };
const md = `# Simulación Omia ${RUN}
*${new Date().toLocaleString("es-AR")} · ${N_INSTR} instructores · ${N_ALUM} alumnos · ${ROUNDS} rondas · cerebro: ${KEY ? "Gemini" : "plantillas"}*

## Resumen
- Llamadas a la API: ${stats.calls} (${stats.ok} con el resultado esperado)
- Textos generados por LLM: ${stats.llm} · por plantilla: ${stats.llmFallback}
- Suscripciones activas: ${aud?.suscripcionesActivas ?? "?"} de ${instr.length} instructores (uno no paga a propósito)
- Compras simuladas: ${aud?.compras ?? "?"} · Solicitudes de clase en admin: ${aud?.reservasEnAdmin ?? "?"}
- Top ranking: ${aud?.ranking?.join(" · ") || "–"}

## Hallazgos (${findings.length})
${findings.length ? [...new Map(findings.map((f) => [f.text, f])).values()].map((f) => `- ${sev[f.sev] || "•"} **${f.sev}** — ${f.text}`).join("\n") : "- Ninguno. Todos los flujos respondieron como se esperaba."}

## Observaciones fijas del diseño actual
- 🟠 **No hay mensajería dentro de Omia**: la charla alumno↔instructor ocurre fuera (teléfono, mail, Instagram). Abajo se simula esa charla, pero la plataforma no la ve.
- 🟠 **El instructor no puede aceptar/rechazar una solicitud desde su panel**: solo existe \`PUT /api/admin/bookings/:id\` (admin). Las reservas quedan siempre en "solicitada".
- 🟡 El pago de la clase es directo con el profesor, así que la simulación de pagos cubre planes de instructores y compras en la tienda.

## Línea de tiempo
${log.join("\n")}

## Conversaciones alumno ↔ instructor
${dialogues.map((d) => `### ${d.al} ↔ ${d.ins} ${d.cierra ? "✅ cierra" : "❌ no cierra"}\n${d.turns.map((t) => `> **${t.de}:** ${t.txt}`).join("\n>\n")}`).join("\n\n")}
`;
const file = path.join(out, `simulacion-${RUN}.md`);
await writeFile(file, md);
console.log(`\n✔ Informe: ${file}\n  Hallazgos: ${findings.length} · llamadas: ${stats.calls}`);
