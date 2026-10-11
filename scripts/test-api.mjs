// Pruebas de punta a punta contra una API local (sin credenciales de Mercado Pago: usa el simulador).
// Uso: API=http://localhost:4100 ADMIN_EMAIL=admin@omia.site ADMIN_PASSWORD=<clave-local> node --test scripts/test-api.mjs
import test from "node:test";
import assert from "node:assert/strict";

const API = process.env.API || "http://localhost:4100";
const run = Date.now().toString(36);
const email = `test-${run}@prueba.test`;
const password = "prueba12345";

const call = async (path, { method = "GET", token, body } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

let token;

test("el registro exige aceptar los términos", async () => {
  const r = await call("/api/auth/register", { method: "POST", body: { email, password, name: "Test", role: "profesor" } });
  assert.equal(r.status, 400);
});

test("registro, ficha y suscripción mensual", async () => {
  const reg = await call("/api/auth/register", { method: "POST", body: { email, password, name: "Test", role: "profesor", acceptTerms: true } });
  assert.equal(reg.status, 201);
  token = reg.data.token;

  const early = await call("/api/subscriptions/checkout", { method: "POST", token, body: { plan: "destacado" } });
  assert.equal(early.status, 409, "sin ficha no se puede suscribir");

  const listing = await call("/api/teachers/create-or-update", { method: "POST", token, body: { name: "Test", location: "Palermo", bio: "x", price: "$8.000/clase" } });
  assert.equal(listing.data.teacher.status, "pendiente", "la ficha nueva queda pendiente hasta el primer cobro");

  const inst = await call("/api/subscriptions/checkout", { method: "POST", token, body: { plan: "institucional" } });
  assert.equal(inst.status, 400, "el plan institucional es solo para institutos");

  const co = await call("/api/subscriptions/checkout", { method: "POST", token, body: { plan: "destacado" } });
  assert.equal(co.status, 200);
  assert.ok(co.data.subscriptionId);

  const synced = await call("/api/subscriptions/sync", { method: "POST", token, body: { subscriptionId: co.data.subscriptionId } });
  assert.equal(synced.data.subscription.status, "activa");

  const me = await call("/api/auth/me", { token });
  assert.equal(me.data.profile.isPremium, true);
  assert.equal(me.data.profile.plan, "destacado");

  const dup = await call("/api/subscriptions/checkout", { method: "POST", token, body: { plan: "inicial" } });
  assert.equal(dup.status, 409, "no se duplican suscripciones activas");
});

test("el navegador no puede activar un plan sin pagar", async () => {
  const other = `otro-${run}@prueba.test`;
  const reg = await call("/api/auth/register", { method: "POST", body: { email: other, password, name: "Otro", role: "profesor", acceptTerms: true } });
  const t = reg.data.token;
  await call("/api/teachers/create-or-update", { method: "POST", token: t, body: { name: "Otro", location: "Palermo" } });
  // En producción esto no existe; en local solo el checkout propio puede aprobar.
  const forged = await call("/api/payments/confirm", { method: "POST", token: t, body: { tx: "00000000-0000-4000-8000-000000000000" } });
  assert.ok([404, 400].includes(forged.status));
  const me = await call("/api/auth/me", { token: t });
  assert.equal(me.data.profile.isPremium, false);
});

test("cambio de plan y baja conservan lo pagado", async () => {
  const change = await call("/api/subscriptions/change", { method: "POST", token, body: { plan: "inicial" } });
  assert.equal(change.data.subscription.plan, "inicial");
  const cancel = await call("/api/subscriptions/cancel", { method: "POST", token });
  assert.equal(cancel.data.subscription.status, "cancelada");
  const me = await call("/api/auth/me", { token });
  assert.equal(me.data.profile.isPremium, true, "los beneficios siguen hasta el fin del período pagado");
});

test("recuperar contraseña no revela si el email existe", async () => {
  const known = await call("/api/auth/forgot-password", { method: "POST", body: { email } });
  const unknown = await call("/api/auth/forgot-password", { method: "POST", body: { email: `no-${run}@prueba.test` } });
  assert.deepEqual(known.data, unknown.data);
  const bad = await call("/api/auth/reset-password", { method: "POST", body: { token: "0".repeat(64), password: "otraclave123" } });
  assert.equal(bad.status, 400);
});

test("webhook ignora avisos desconocidos y firmas ausentes no rompen", async () => {
  const res = await fetch(`${API}/api/webhooks/mercadopago?type=otra_cosa&data.id=1`, { method: "POST" });
  assert.equal(res.status, 200);
});

test("las clases ya no se pagan por Omia", async () => {
  const r = await call("/api/payments/mercadopago", { method: "POST", token, body: { type: "booking", itemId: "x" } });
  assert.equal(r.status, 400);
  const sub = await call("/api/payments/mercadopago", { method: "POST", token, body: { type: "subscription", itemId: "destacado" } });
  assert.equal(sub.status, 400, "la membresía va solo por /api/subscriptions");
});

test("formularios públicos y sitemap", async () => {
  const c = await call("/api/contact", { method: "POST", body: { kind: "baja", email, name: "Test" } });
  assert.equal(c.status, 201);
  const bad = await call("/api/contact", { method: "POST", body: { kind: "arrepentimiento", email } });
  assert.equal(bad.status, 400, "el arrepentimiento exige referencia");
  const sm = await fetch(`${API}/sitemap.xml`);
  assert.match(await sm.text(), /<urlset/);
});

test("el contenido del sitio se edita solo como administrador y se puede restaurar", async () => {
  const anon = await call("/api/admin/content", { method: "PUT", body: { values: { "home.hero.title": "x" } } });
  assert.equal(anon.status, 401);
  const noAdmin = await call("/api/admin/content", { method: "PUT", token, body: { values: { "home.hero.title": "x" } } });
  assert.equal(noAdmin.status, 403);

  const admin = await call("/api/auth/login", { method: "POST", body: { email: process.env.ADMIN_EMAIL || "admin@omia.site", password: process.env.ADMIN_PASSWORD || "local-admin-pass-123" } });
  const at = admin.data.token;
  const bad = await call("/api/admin/content", { method: "PUT", token: at, body: { values: { "Clave Mala": "x" } } });
  assert.equal(bad.status, 400);

  const saved = await call("/api/admin/content", { method: "PUT", token: at, body: { values: { "home.hero.title": `Título ${run}`, "plan.inicial.features": ["Uno", "Dos"] } } });
  assert.equal(saved.data["home.hero.title"], `Título ${run}`);
  const pub = await call("/api/content");
  assert.deepEqual(pub.data["plan.inicial.features"], ["Uno", "Dos"]);

  const reset = await call("/api/admin/content", { method: "PUT", token: at, body: { values: { "home.hero.title": null, "plan.inicial.features": null } } });
  assert.equal(reset.data["home.hero.title"], undefined);
});
