// Crea perfiles de prueba contra una API de Omia en modo desarrollo (pagos simulados).
// Uso: API=http://localhost:4100 node scripts/seed-prueba.mjs
// No sirve contra producción: ahí el plan solo se activa con un pago real.
const API = process.env.API || 'http://localhost:4100';
const PASSWORD = 'prueba12345';

async function call(path, body, token, method = body ? 'POST' : 'GET') {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) throw new Error(`${method} ${path} → ${res.status} ${data.error || ''}`);
  return data;
}

// Registra la cuenta o, si ya existe, inicia sesión.
async function account(email, name, role) {
  const created = await call('/api/auth/register', { email, password: PASSWORD, name, role });
  if (created.token) return created.token;
  return (await call('/api/auth/login', { email, password: PASSWORD })).token;
}

const profe = await account('profe@prueba.test', 'Lucía Méndez (prueba)', 'profesor');
const { teacher } = await call('/api/teachers/create-or-update', {
  name: 'Lucía Méndez (prueba)',
  specialty: 'Pilates Reformer',
  discipline: 'Pilates',
  location: 'Palermo',
  price: '$9.500/clase',
  availableDays: ['Lun', 'Mié', 'Vie', 'Sáb'],
  bio: 'Perfil de prueba. Instructora de Pilates Reformer y Mat con 8 años de experiencia. Clases individuales y en grupos reducidos.',
  image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600',
  email: 'profe@prueba.test',
  phone: '1155550000',
}, profe);

if (!teacher.plan_active) {
  const pay = await call('/api/payments/mercadopago', { type: 'subscription', itemId: 'destacado' }, profe);
  if (!pay.isMock) throw new Error('La API no está en modo simulador: el plan de prueba no se puede activar sin un pago real.');
  await call('/api/payments/confirm', { tx: pay.transactionId }, profe);
}

const alumno = await account('alumno@prueba.test', 'Juan Pérez (prueba)', 'alumno');
await call(`/api/favorites/${teacher.id}`, {}, alumno);
await call(`/api/teachers/${teacher.id}/visit`, {}, alumno);
if ((await call('/api/user/bookings', null, alumno)).length === 0) {
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await call('/api/bookings', { teacherId: teacher.id, date, time: '10:00' }, alumno);
}
const review = await call(`/api/teachers/${teacher.id}/reviews`, { rating: 5, comment: 'Reseña de prueba: clases muy claras y buen ambiente.' }, alumno);
await call(`/api/reviews/${review.review.id}/reply`, { reply: '¡Gracias, Juan! Te espero en la próxima clase.' }, profe);

console.log(`Perfiles de prueba listos (contraseña de ambos: ${PASSWORD})
  Profesor: profe@prueba.test   → ficha /profesor/${teacher.id}
  Alumno:   alumno@prueba.test`);
