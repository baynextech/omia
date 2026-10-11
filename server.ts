import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { Pool, PoolClient, types } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { MercadoPagoConfig, Preference, Payment, PreApproval } from 'mercadopago';

dotenv.config();

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '4000', 10);
// APP_URL: dónde vive el sitio (a donde vuelve Mercado Pago). API_URL: dónde vive esta API (webhook).
const APP_URL = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');
const API_URL = (process.env.API_URL || '').replace(/\/$/, '');
const DATABASE_URL = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? '' : 'omia_solo_desarrollo_no_usar_en_produccion');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@omia.site';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
// Login con Google (ID de cliente de OAuth, tipo "Aplicación web"). Sin esto el botón no se muestra.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
// Mails transaccionales por Resend. Sin clave, los mails se escriben en el log del servidor.
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Omia <no-reply@omia.site>';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || '';

// En producción no se arranca con valores de relleno.
if (IS_PROD) {
  const problems: string[] = [];
  if (!DATABASE_URL) problems.push('falta DATABASE_URL');
  if (JWT_SECRET.length < 32) problems.push('JWT_SECRET falta o tiene menos de 32 caracteres');
  if (problems.length) {
    console.error(`[config] No se puede arrancar en producción: ${problems.join('; ')}`);
    process.exit(1);
  }
}

const PLANS: Record<string, string> = {
  inicial: 'Plan Inicial',
  destacado: 'Plan Destacado',
  institucional: 'Plan Institucional',
};
const PLAN_DAYS = 30;
// Días extra que se mantiene el plan cuando un cobro mensual no entra, mientras Mercado Pago reintenta.
const GRACE_DAYS = 5;
const PUBLIC_ROLES = ['alumno', 'profesor', 'instituto'];
const MAX_GALLERY_IMAGES = 8;
// Mínimo de reseñas "virtuales" con que se pondera el ranking (promedio bayesiano).
const RANKING_PRIOR = 3;

// ─── DB Pool ─────────────────────────────────────────────────────────────────

types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC → number
types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT (COUNT) → number
types.setTypeParser(1082, (v) => v); // DATE → 'YYYY-MM-DD'

const pool = new Pool({
  connectionString: DATABASE_URL,
  // SSL solo si se pide (base externa). La base del contenedor en la misma red no lo soporta.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// ─── AI Clients ──────────────────────────────────────────────────────────────

const genai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// ─── MercadoPago ─────────────────────────────────────────────────────────────

const mp = MP_ACCESS_TOKEN ? new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN }) : null;
// El simulador de pago solo existe para desarrollo local sin credenciales.
const SIMULATED_PAYMENTS = !mp && !IS_PROD;

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);

// ─── CORS ────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  'https://omia.site',
  'https://www.omia.site',
  'https://api.omia.site',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Types ───────────────────────────────────────────────────────────────────

type Row = Record<string, any>;

interface JwtPayload {
  userId: string;
}

interface AuthRequest extends Request {
  user?: { id: string };
  profile?: Row;
}

type Handler = (req: AuthRequest, res: Response) => Promise<unknown> | unknown;

// Envuelve un handler async para que los errores lleguen al manejador global.
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req as AuthRequest, res)).catch(next);
};

// ─── Rate limit (en memoria, por IP) ─────────────────────────────────────────

function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (hits.size > 10000) {
      for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }
    const key = req.ip || 'desconocido';
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.n > max) {
      res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
      return;
    }
    next();
  };
}

const authLimiter = rateLimit(20, 15 * 60 * 1000);
const aiLimiter = rateLimit(30, 10 * 60 * 1000);

// ─── Auth Middlewares ─────────────────────────────────────────────────────────

async function loadUser(req: Request): Promise<Row | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as JwtPayload;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

// auth() exige sesión; auth('admin') exige además alguno de los roles indicados.
function auth(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await loadUser(req);
      if (!user) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }
      if (roles.length && !roles.includes(user.role)) {
        res.status(403).json({ error: 'Acceso denegado' });
        return;
      }
      req.user = { id: user.id };
      req.profile = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

const requireAdmin = auth('admin');

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// ─── Helpers de datos ────────────────────────────────────────────────────────

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

// Los filtros del sitio mandan "Todos", "Todas", "Cualquier día"… como "sin filtro".
const realFilter = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && !/^(tod[oa]s|cualquier)/i.test(s) ? s : null;
};

// "$8.000/clase" → 8000
const priceToNumber = (price: unknown): number =>
  parseInt(String(price || '').split('/')[0].replace(/\D/g, ''), 10) || 0;

const formatARS = (n: unknown): string => `$${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;

const PRICE_SQL = `NULLIF(regexp_replace(split_part(COALESCE(price, ''), '/', 1), '\\D', '', 'g'), '')::numeric`;

// Ficha pública de un profesor o instituto, con los nombres que usa el frontend.
function teacherDTO(t: Row): Row {
  const images: string[] = t.images || [];
  return {
    ...t,
    rating: Number(t.rating) || 0,
    review_count: Number(t.review_count) || 0,
    reviews: Number(t.review_count) || 0,
    image: images[0] || '',
    photo_url: images[0] || '',
    availableDays: t.available_days || [],
    description: t.bio || '',
    isPremium: !!t.plan_active,
  };
}

async function getTeacherByUser(userId: string): Promise<Row | null> {
  const result = await pool.query('SELECT * FROM teachers WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

// Perfil de la cuenta tal como lo espera el panel (/perfil).
function profileDTO(user: Row, teacher: Row | null): Row {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email,
    bio: user.bio || '',
    avatar: user.avatar_url || '',
    avatar_url: user.avatar_url || '',
    role: user.role,
    created_at: user.created_at,
    teacherId: teacher?.id || null,
    teacherStatus: teacher?.status || null,
    plan: teacher?.plan_active ? teacher.plan : 'ninguno',
    planExpiresAt: teacher?.plan_active ? teacher.plan_expires_at : null,
    isPremium: !!teacher?.plan_active,
  };
}

async function sessionPayload(user: Row) {
  const profile = profileDTO(user, await getTeacherByUser(user.id));
  const token = signToken(user.id);
  return { user: profile, profile, token, session: { access_token: token } };
}

async function recalcRating(teacherId: string, client: Pool | PoolClient = pool): Promise<void> {
  await client.query(
    `UPDATE teachers t SET
       rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE teacher_id = t.id), 0),
       review_count = (SELECT COUNT(*) FROM reviews WHERE teacher_id = t.id)
     WHERE t.id = $1`,
    [teacherId]
  );
}

async function getPlanPrices(): Promise<Record<string, number>> {
  const result = await pool.query(`SELECT key, value FROM admin_config WHERE key LIKE 'plan_%_price'`);
  const prices: Record<string, number> = {};
  for (const row of result.rows) {
    const plan = String(row.key).replace(/^plan_/, '').replace(/_price$/, '');
    prices[plan] = Number(row.value) || 0;
  }
  return prices;
}

// Envío: tarifa única configurable desde el admin y gratis a partir de cierto monto.
async function getShippingCost(subtotal: number): Promise<number> {
  const rows = (await pool.query(`SELECT key, value FROM admin_config WHERE key IN ('shipping_flat_price', 'free_shipping_from')`)).rows;
  const cfg = Object.fromEntries(rows.map((r) => [r.key, Number(r.value) || 0]));
  if (cfg.free_shipping_from > 0 && subtotal >= cfg.free_shipping_from) return 0;
  return cfg.shipping_flat_price || 0;
}

// ─── Mails ───────────────────────────────────────────────────────────────────

const escapeHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.url)}" style="background:#98A77C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2C2C2C">
<h2 style="font-weight:500;margin:0 0 16px">${escapeHtml(title)}</h2>${bodyHtml}${button}
<p style="color:#888;font-size:12px;margin-top:32px">Omia · Yoga &amp; Pilates · <a href="${APP_URL}" style="color:#888">${APP_URL.replace(/^https?:\/\//, '')}</a></p></div>`;
}

// Nunca interrumpe el flujo que lo llama: si el mail falla se registra y se sigue.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to) return;
  if (!RESEND_API_KEY) {
    console.log(`[mail] (sin RESEND_API_KEY) → ${to}: ${subject}`);
    // Solo en desarrollo: muestra los enlaces del mail para poder probar los flujos sin casilla real.
    if (!IS_PROD) for (const m of html.matchAll(/href="([^"]+)"/g)) console.log(`[mail]   enlace: ${m[1].replace(/&amp;/g, '&')}`);
    return;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    if (!response.ok) console.error(`[mail] Resend respondió ${response.status} al enviar "${subject}"`);
  } catch (err) {
    console.error('[mail] No se pudo enviar:', (err as Error).message);
  }
}

const mails = {
  welcome: (user: Row) => sendEmail(
    user.email, '¡Bienvenido/a a Omia!',
    emailLayout(`¡Hola${user.name ? `, ${String(user.name).split(' ')[0]}` : ''}!`,
      user.role === 'alumno'
        ? '<p>Tu cuenta está lista. Ya podés buscar profes e institutos de yoga y pilates, guardar tus favoritos y dejar reseñas.</p>'
        : '<p>Tu cuenta está lista. El siguiente paso es completar tu ficha pública y activar tu plan para aparecer en el directorio.</p>',
      { label: user.role === 'alumno' ? 'Explorar el directorio' : 'Completar mi ficha', url: `${APP_URL}${user.role === 'alumno' ? '/directorio' : '/perfil'}` })
  ),
  passwordReset: (user: Row, link: string) => sendEmail(
    user.email, 'Recuperá tu contraseña de Omia',
    emailLayout('Recuperá tu contraseña',
      '<p>Pediste cambiar tu contraseña. El enlace vale por 1 hora. Si no fuiste vos, ignorá este mensaje: tu cuenta sigue segura.</p>',
      { label: 'Elegir una contraseña nueva', url: link })
  ),
  subscriptionActive: (user: Row, plan: string, amount: number, nextAt: Date | null) => sendEmail(
    user.email, 'Tu plan de Omia está activo',
    emailLayout('¡Tu plan está activo!',
      `<p>Activaste el <b>${escapeHtml(PLANS[plan] || plan)}</b> por ${formatARS(amount)} por mes. Tu ficha ya figura en el directorio.</p>` +
      (nextAt ? `<p>El próximo cobro es el ${nextAt.toLocaleDateString('es-AR')}. Podés darte de baja cuando quieras desde tu panel.</p>` : ''),
      { label: 'Ir a mi panel', url: `${APP_URL}/perfil` })
  ),
  paymentOk: (user: Row, plan: string, amount: number) => sendEmail(
    user.email, 'Recibimos tu pago mensual',
    emailLayout('Pago recibido', `<p>Acreditamos el pago de ${formatARS(amount)} de tu ${escapeHtml(PLANS[plan] || plan)}. ¡Gracias por ser parte de Omia!</p>`)
  ),
  paymentFailed: (user: Row, plan: string) => sendEmail(
    user.email, 'No pudimos cobrar tu plan de Omia',
    emailLayout('Hubo un problema con tu cobro',
      `<p>Mercado Pago no pudo procesar el cobro de tu ${escapeHtml(PLANS[plan] || plan)}. Lo va a reintentar automáticamente. Si seguís sin saldo, o cambiaste de tarjeta, actualizá el medio de pago para no perder tu lugar en el directorio (te mantenemos el plan ${GRACE_DAYS} días más).</p>`,
      { label: 'Revisar mi plan', url: `${APP_URL}/perfil` })
  ),
  subscriptionCancelled: (user: Row, plan: string, until: Date | null) => sendEmail(
    user.email, 'Tu plan de Omia fue dado de baja',
    emailLayout('Baja confirmada',
      `<p>Cancelamos el cobro mensual de tu ${escapeHtml(PLANS[plan] || plan)}.` +
      (until ? ` Tu ficha mantiene los beneficios hasta el ${until.toLocaleDateString('es-AR')}.` : '') +
      ' Cuando quieras volver, podés reactivar el plan desde tu panel.</p>')
  ),
  subscriptionExpired: (user: Row) => sendEmail(
    user.email, 'Tu plan de Omia venció',
    emailLayout('Tu plan venció', '<p>Tu ficha sigue publicada, pero ya no tiene los beneficios del plan. Podés reactivarlo cuando quieras.</p>',
      { label: 'Reactivar mi plan', url: `${APP_URL}/para-profes` })
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: NODE_ENV });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', authLimiter, h(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const name = String(req.body.name || '').trim();
  const role = PUBLIC_ROLES.includes(req.body.role) ? req.body.role : 'alumno';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ingresá un email válido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Ingresá tu nombre' });
  }
  // Ley 25.326: el consentimiento tiene que quedar registrado.
  if (req.body.acceptTerms !== true) {
    return res.status(400).json({ error: 'Tenés que aceptar los Términos y la Política de privacidad' });
  }

  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length > 0) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, terms_accepted_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
    [email, password_hash, name, role]
  );
  void mails.welcome(result.rows[0]);
  res.status(201).json(await sessionPayload(result.rows[0]));
}));

// Cifras reales para la portada (solo fichas publicadas).
app.get('/api/stats', h(async (_req, res) => {
  const r = (await pool.query(
    `SELECT COUNT(*) FILTER (WHERE kind = 'profesor') AS teachers,
            COUNT(*) FILTER (WHERE kind = 'instituto') AS institutes,
            COUNT(DISTINCT NULLIF(TRIM(location), '')) AS zones
     FROM teachers WHERE status = 'activo'`
  )).rows[0];
  res.set('Cache-Control', 'public, max-age=300').json({ teachers: Number(r.teachers), institutes: Number(r.institutes), zones: Number(r.zones) });
}));

// Configuración pública que necesita el sitio para saber qué mostrar.
app.get('/api/config', (_req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID || null, paymentsEnabled: !!mp || SIMULATED_PAYMENTS });
});

// Login / registro con Google. El navegador manda el ID token de Google Identity Services;
// se valida contra Google y que sea para esta aplicación antes de confiar en nada.
app.post('/api/auth/google', authLimiter, h(async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'El ingreso con Google no está disponible' });
  const credential = String(req.body.credential || '');
  if (!credential) return res.status(400).json({ error: 'Falta la credencial de Google' });

  const verify = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!verify.ok) return res.status(401).json({ error: 'No pudimos validar tu cuenta de Google' });
  const info = (await verify.json()) as Row;
  const emailVerified = info.email_verified === true || info.email_verified === 'true';
  if (info.aud !== GOOGLE_CLIENT_ID || !info.sub || !info.email || !emailVerified) {
    return res.status(401).json({ error: 'No pudimos validar tu cuenta de Google' });
  }

  const email = String(info.email).toLowerCase();
  let user = (await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [info.sub, email])).rows[0];
  if (user) {
    // Si ya existía con ese email, se vincula la cuenta de Google (Google verificó el email).
    user = (await pool.query(
      `UPDATE users SET google_id = COALESCE(google_id, $2), email_verified = true,
         avatar_url = COALESCE(avatar_url, $3), name = COALESCE(NULLIF(name, ''), $4)
       WHERE id = $1 RETURNING *`,
      [user.id, info.sub, info.picture || null, info.name || null]
    )).rows[0];
  } else {
    const role = PUBLIC_ROLES.includes(req.body.role) ? req.body.role : 'alumno';
    if (req.body.acceptTerms !== true) {
      return res.status(400).json({ error: 'Tenés que aceptar los Términos y la Política de privacidad', needsTerms: true });
    }
    // Hash de una clave aleatoria que nadie conoce: la cuenta solo entra por Google o por "olvidé mi contraseña".
    const unusable = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    user = (await pool.query(
      `INSERT INTO users (email, password_hash, name, role, google_id, email_verified, avatar_url, terms_accepted_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, NOW()) RETURNING *`,
      [email, unusable, info.name || email.split('@')[0], role, info.sub, info.picture || null]
    )).rows[0];
    void mails.welcome(user);
  }
  res.json(await sessionPayload(user));
}));

// ─── Recuperar contraseña ─────────────────────────────────────────────────────

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
const resetLimiter = rateLimit(5, 15 * 60 * 1000);

// Siempre responde lo mismo, exista o no el email, para no revelar quién tiene cuenta.
app.post('/api/auth/forgot-password', resetLimiter, h(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [user.id, hashToken(token)]
      );
      void mails.passwordReset(user, `${APP_URL}/?reset=${token}`);
    }
  }
  res.json({ success: true });
}));

app.post('/api/auth/reset-password', resetLimiter, h(async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  if (!/^[0-9a-f]{64}$/.test(token)) return res.status(400).json({ error: 'El enlace no es válido o venció' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Se marca como usado en la misma sentencia que lo lee: un enlace solo sirve una vez.
    const used = await client.query(
      `UPDATE password_resets SET used_at = NOW()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING user_id`,
      [hashToken(token)]
    );
    if (!used.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El enlace no es válido o venció' });
    }
    const user = (await client.query(
      'UPDATE users SET password_hash = $2, email_verified = true WHERE id = $1 RETURNING *',
      [used.rows[0].user_id, await bcrypt.hash(password, 12)]
    )).rows[0];
    await client.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
    await client.query('COMMIT');
    res.json(await sessionPayload(user));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

app.post('/api/auth/login', authLimiter, h(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Ingresá email y contraseña' });
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }
  res.json(await sessionPayload(user));
}));

app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/me', auth(), h(async (req, res) => {
  const profile = profileDTO(req.profile!, await getTeacherByUser(req.user!.id));
  res.json({ user: profile, profile });
}));

// ─── Planes (público) ─────────────────────────────────────────────────────────

app.get('/api/plans', h(async (_req, res) => {
  const prices = await getPlanPrices();
  res.json(Object.keys(PLANS).map((id) => ({ id, name: PLANS[id], price: prices[id] || 0 })));
}));

// ─── Teachers / Institutos (público) ─────────────────────────────────────────

async function listListings(query: Request['query'], kind: string | null): Promise<Row[]> {
  const conditions: string[] = [`status = 'activo'`];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (kind) add('kind = ?', kind);
  const location = realFilter(query.location);
  if (location) add('LOWER(location) LIKE ?', `%${location.toLowerCase()}%`);
  const discipline = realFilter(query.discipline);
  if (discipline) add('LOWER(discipline) LIKE ?', `%${discipline.toLowerCase()}%`);
  const specialty = realFilter(query.specialty);
  if (specialty) add('LOWER(specialty) LIKE ?', `%${specialty.toLowerCase()}%`);
  const search = realFilter(query.q);
  if (search) {
    add(`LOWER(CONCAT_WS(' ', name, specialty, discipline, location, bio)) LIKE ?`, `%${search.toLowerCase()}%`);
  }

  const priceRange = realFilter(query.priceRange);
  if (priceRange === 'Menos de $5.000') conditions.push(`${PRICE_SQL} < 5000`);
  else if (priceRange === '$5.000 - $10.000') conditions.push(`${PRICE_SQL} BETWEEN 5000 AND 10000`);
  else if (priceRange === 'Más de $10.000') conditions.push(`${PRICE_SQL} > 10000`);

  const availability = realFilter(query.availability);
  if (availability === 'Fin de semana') conditions.push(`available_days && ARRAY['Sáb','Dom']`);
  else if (availability === 'Días de semana') conditions.push(`available_days && ARRAY['Lun','Mar','Mié','Jue','Vie']`);

  const result = await pool.query(
    `SELECT * FROM teachers WHERE ${conditions.join(' AND ')}
     ORDER BY plan_active DESC, (plan = 'destacado') DESC, rating DESC, review_count DESC, created_at DESC`,
    params
  );
  return result.rows.map(teacherDTO);
}

app.get('/api/teachers', h(async (req, res) => {
  const kind = req.query.kind === 'all' ? null : req.query.kind === 'instituto' ? 'instituto' : 'profesor';
  res.json(await listListings(req.query, kind));
}));

app.get('/api/institutes', h(async (req, res) => {
  res.json(await listListings(req.query, 'instituto'));
}));

app.get('/api/institutes/:id/staff', h(async (req, res) => {
  if (!isUuid(req.params.id)) return res.json([]);
  const result = await pool.query(
    `SELECT * FROM teachers WHERE institute_id = $1 AND status = 'activo' ORDER BY rating DESC`,
    [req.params.id]
  );
  res.json(result.rows.map(teacherDTO));
}));

// Ranking: promedio ponderado por cantidad de reseñas, para que una sola reseña de 5
// no le gane a alguien con muchas reseñas de 4,8.
app.get('/api/ranking', h(async (req, res) => {
  const conditions: string[] = [`status = 'activo'`, 'review_count > 0'];
  const params: unknown[] = [RANKING_PRIOR];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };
  if (req.query.kind === 'profesor' || req.query.kind === 'instituto') add('kind = ?', req.query.kind);
  const location = realFilter(req.query.location);
  if (location) add('LOWER(location) LIKE ?', `%${location.toLowerCase()}%`);
  const discipline = realFilter(req.query.discipline);
  if (discipline) add('LOWER(discipline) LIKE ?', `%${discipline.toLowerCase()}%`);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);

  const result = await pool.query(
    `WITH global AS (
       SELECT COALESCE(AVG(rating), 0) AS avg_rating FROM teachers WHERE status = 'activo' AND review_count > 0
     )
     SELECT t.*,
            ROUND(((t.review_count * t.rating + $1 * g.avg_rating) / (t.review_count + $1))::numeric, 2) AS score
     FROM teachers t CROSS JOIN global g
     WHERE ${conditions.join(' AND ')}
     ORDER BY score DESC, t.review_count DESC, t.created_at ASC
     LIMIT ${limit}`,
    params
  );
  res.json(result.rows.map((row, i) => ({ ...teacherDTO(row), score: Number(row.score), position: i + 1 })));
}));

app.get('/api/teachers/:id', h(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Profesor no encontrado' });
  const result = await pool.query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
  const teacher = result.rows[0];
  if (!teacher) return res.status(404).json({ error: 'Profesor no encontrado' });

  // Una ficha que todavía no está activa solo la ven su dueño y el admin.
  if (teacher.status !== 'activo') {
    const viewer = await loadUser(req);
    if (!viewer || (viewer.id !== teacher.user_id && viewer.role !== 'admin')) {
      return res.status(404).json({ error: 'Profesor no encontrado' });
    }
  }
  res.json(teacherDTO(teacher));
}));

app.post('/api/teachers/:id/visit', h(async (req, res) => {
  if (!isUuid(req.params.id)) return res.json({ success: false });
  const viewer = await loadUser(req);
  const result = await pool.query(
    `UPDATE teachers SET impressions = COALESCE(impressions, 0) + 1
     WHERE id = $1 AND user_id IS DISTINCT FROM $2 RETURNING id`,
    [req.params.id, viewer?.id || null]
  );
  if (result.rows.length) {
    await pool.query(
      `INSERT INTO teacher_visits (teacher_id, user_id, visitor_name) VALUES ($1, $2, $3)`,
      [req.params.id, viewer?.id || null, viewer?.name || 'Invitado']
    );
  }
  res.json({ success: true });
}));

// ─── Reseñas ─────────────────────────────────────────────────────────────────

const REVIEW_SELECT = `
  SELECT r.*, t.name AS teacher_name,
         EXISTS (SELECT 1 FROM bookings b WHERE b.student_id = r.student_id AND b.teacher_id = r.teacher_id) AS verified
  FROM reviews r JOIN teachers t ON t.id = r.teacher_id`;

function reviewDTO(r: Row): Row {
  return {
    ...r,
    userName: r.student_name || 'Alumno/a de Omia',
    teacherName: r.teacher_name || '',
    teacherId: r.teacher_id,
    date: r.created_at,
    replyDate: r.reply_at,
    verified: !!r.verified,
  };
}

app.get('/api/teachers/:id/reviews', h(async (req, res) => {
  if (!isUuid(req.params.id)) return res.json([]);
  const result = await pool.query(`${REVIEW_SELECT} WHERE r.teacher_id = $1 ORDER BY r.created_at DESC`, [req.params.id]);
  res.json(result.rows.map(reviewDTO));
}));

app.post('/api/teachers/:id/reviews', auth(), h(async (req, res) => {
  const teacherId = req.params.id;
  const rating = Math.round(Number(req.body.rating));
  const comment = String(req.body.comment || '').trim().slice(0, 2000);
  if (!isUuid(teacherId)) return res.status(404).json({ error: 'Profesor no encontrado' });
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'El puntaje debe ser de 1 a 5' });

  const teacherResult = await pool.query('SELECT user_id FROM teachers WHERE id = $1', [teacherId]);
  if (!teacherResult.rows.length) return res.status(404).json({ error: 'Profesor no encontrado' });
  if (teacherResult.rows[0].user_id === req.user!.id) {
    return res.status(403).json({ error: 'No podés calificar tu propio perfil' });
  }

  // Una reseña por persona: si ya existe, se actualiza.
  const review = await pool.query(
    `INSERT INTO reviews (student_id, student_name, teacher_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id, teacher_id)
     DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment,
                   student_name = EXCLUDED.student_name, updated_at = NOW()
     RETURNING id`,
    [req.user!.id, req.profile!.name || 'Usuario', teacherId, rating, comment]
  );
  await recalcRating(teacherId);

  const [teacher, saved] = await Promise.all([
    pool.query('SELECT * FROM teachers WHERE id = $1', [teacherId]),
    pool.query(`${REVIEW_SELECT} WHERE r.id = $1`, [review.rows[0].id]),
  ]);
  res.json({ ...teacherDTO(teacher.rows[0]), review: reviewDTO(saved.rows[0]) });
}));

// El profesional (o el admin) responde una reseña que recibió.
app.post('/api/reviews/:id/reply', auth(), h(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Reseña no encontrada' });
  const reply = String(req.body.reply || '').trim().slice(0, 2000);
  const result = await pool.query(
    `UPDATE reviews r SET reply = NULLIF($1, ''), reply_at = CASE WHEN $1 = '' THEN NULL ELSE NOW() END
     FROM teachers t
     WHERE r.id = $2 AND t.id = r.teacher_id AND (t.user_id = $3 OR $4 = 'admin')
     RETURNING r.id`,
    [reply, req.params.id, req.user!.id, req.profile!.role]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Reseña no encontrada' });
  const saved = await pool.query(`${REVIEW_SELECT} WHERE r.id = $1`, [req.params.id]);
  res.json(reviewDTO(saved.rows[0]));
}));

// ─── Products (public) ───────────────────────────────────────────────────────

function productDTO(p: Row): Row {
  const images: string[] = p.images || [];
  return {
    ...p,
    price: Number(p.price) || 0,
    image: images[0] || '',
    discipline: p.discipline || 'Yoga & Pilates',
    inStock: Number(p.stock) > 0,
    features: p.features || [],
  };
}

app.get('/api/products', h(async (_req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE active = true ORDER BY created_at DESC');
  res.json(result.rows.map(productDTO));
}));

// ─── Cuenta ──────────────────────────────────────────────────────────────────

app.get('/api/user/profile', auth(), h(async (req, res) => {
  res.json(profileDTO(req.profile!, await getTeacherByUser(req.user!.id)));
}));

app.post('/api/user/profile', auth(), h(async (req, res) => {
  const { name, bio } = req.body;
  const avatar = req.body.avatar ?? req.body.avatar_url;
  // El rol admin no se toca desde acá; el resto puede pasar de alumno a profesor o instituto.
  const role = req.profile!.role !== 'admin' && PUBLIC_ROLES.includes(req.body.role) ? req.body.role : null;

  const result = await pool.query(
    `UPDATE users SET
       name = COALESCE(NULLIF($1, ''), name),
       avatar_url = COALESCE($2, avatar_url),
       bio = COALESCE($3, bio),
       role = COALESCE($4, role)
     WHERE id = $5 RETURNING *`,
    [typeof name === 'string' ? name.trim() : null, avatar ?? null, bio ?? null, role, req.user!.id]
  );
  const user = result.rows[0];
  if (role === 'profesor' || role === 'instituto') {
    await pool.query('UPDATE teachers SET kind = $1 WHERE user_id = $2', [role, user.id]);
  }
  res.json(profileDTO(user, await getTeacherByUser(user.id)));
}));

function bookingDTO(b: Row): Row {
  return {
    ...b,
    teacherId: b.teacher_id,
    teacherName: b.teacher_name || '',
    studentName: b.student_name || '',
    studentEmail: b.student_email || '',
    price: formatARS(b.price),
    amount: Number(b.price) || 0,
    paymentStatus: 'A coordinar con el profesional',
  };
}

// Reservas que hizo la persona (panel de quien contrata).
app.get('/api/user/bookings', auth(), h(async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, COALESCE(t.name, b.teacher_name) AS teacher_name, t.phone AS teacher_phone, t.location AS teacher_location
     FROM bookings b LEFT JOIN teachers t ON t.id = b.teacher_id
     WHERE b.student_id = $1 ORDER BY b.date DESC, b.created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows.map(bookingDTO));
}));

// Reservas que recibió el profesional o instituto (su panel).
app.get('/api/teacher/bookings', auth(), h(async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, u.name AS student_name, u.email AS student_email
     FROM bookings b
     JOIN teachers t ON t.id = b.teacher_id
     LEFT JOIN users u ON u.id = b.student_id
     WHERE t.user_id = $1 ORDER BY b.date DESC, b.created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows.map(bookingDTO));
}));

app.get('/api/user/favorites', auth(), h(async (req, res) => {
  const result = await pool.query(
    `SELECT t.* FROM favorites f JOIN teachers t ON t.id = f.teacher_id
     WHERE f.student_id = $1 ORDER BY f.created_at DESC`,
    [req.user!.id]
  );
  res.json(result.rows.map(teacherDTO));
}));

app.post('/api/favorites/:teacherId', auth(), h(async (req, res) => {
  if (!isUuid(req.params.teacherId)) return res.status(404).json({ error: 'Profesor no encontrado' });
  await pool.query(
    `INSERT INTO favorites (student_id, teacher_id) VALUES ($1, $2)
     ON CONFLICT (student_id, teacher_id) DO NOTHING`,
    [req.user!.id, req.params.teacherId]
  );
  res.json({ success: true });
}));

app.delete('/api/favorites/:teacherId', auth(), h(async (req, res) => {
  if (!isUuid(req.params.teacherId)) return res.json({ success: true });
  await pool.query('DELETE FROM favorites WHERE student_id = $1 AND teacher_id = $2', [
    req.user!.id,
    req.params.teacherId,
  ]);
  res.json({ success: true });
}));

// Para quien contrata: las reseñas que escribió. Para el profesional: las que recibió.
app.get('/api/user/reviews', auth(), h(async (req, res) => {
  const teacher = await getTeacherByUser(req.user!.id);
  const result = teacher
    ? await pool.query(`${REVIEW_SELECT} WHERE r.teacher_id = $1 ORDER BY r.created_at DESC`, [teacher.id])
    : await pool.query(`${REVIEW_SELECT} WHERE r.student_id = $1 ORDER BY r.created_at DESC`, [req.user!.id]);
  res.json(result.rows.map(reviewDTO));
}));

// Últimos perfiles que miró la persona.
app.get('/api/user/visited', auth(), h(async (req, res) => {
  const result = await pool.query(
    `SELECT t.* FROM teachers t
     JOIN (SELECT teacher_id, MAX(created_at) AS last_visit FROM teacher_visits
           WHERE user_id = $1 GROUP BY teacher_id) v ON v.teacher_id = t.id
     WHERE t.status = 'activo' ORDER BY v.last_visit DESC LIMIT 12`,
    [req.user!.id]
  );
  res.json(result.rows.map(teacherDTO));
}));

// ─── Panel del profesional / instituto ───────────────────────────────────────

app.get('/api/teacher/profile', auth(), h(async (req, res) => {
  const teacher = await getTeacherByUser(req.user!.id);
  res.json(teacher ? teacherDTO(teacher) : null);
}));

app.post('/api/teachers/create-or-update', auth(), h(async (req, res) => {
  const userId = req.user!.id;
  const b = req.body;
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  // La foto principal va primera en la galería.
  const gallery = [b.image, ...(Array.isArray(b.images) ? b.images : [])]
    .filter((img): img is string => typeof img === 'string' && img.length > 0);
  const images = [...new Set(gallery)];
  if (images.length > MAX_GALLERY_IMAGES) {
    return res.status(400).json({ error: `Podés subir hasta ${MAX_GALLERY_IMAGES} fotos` });
  }

  // Quien arma su ficha pasa a ser profesional; el instituto conserva su tipo.
  let user = req.profile!;
  if (user.role === 'alumno') {
    user = (await pool.query(`UPDATE users SET role = 'profesor' WHERE id = $1 RETURNING *`, [userId])).rows[0];
  }
  const kind = user.role === 'instituto' ? 'instituto' : 'profesor';
  const availableDays = Array.isArray(b.availableDays) ? b.availableDays : Array.isArray(b.available_days) ? b.available_days : null;
  const instituteId = isUuid(b.institute_id) ? b.institute_id : null;

  const fields = [
    name, b.specialty ?? null, b.discipline ?? null, b.location ?? null, b.bio ?? null, b.price ?? null,
    availableDays, b.email ?? null, b.phone ?? null, images.length ? images : null,
    b.address ?? null, b.hours ?? null, Array.isArray(b.amenities) ? b.amenities : null,
    b.instagram ?? null, b.website ?? null,
  ];

  const existing = await getTeacherByUser(userId);
  let teacher: Row;
  if (existing) {
    teacher = (await pool.query(
      `UPDATE teachers SET
         name = $1, specialty = COALESCE($2, specialty), discipline = COALESCE($3, discipline),
         location = COALESCE($4, location), bio = COALESCE($5, bio), price = COALESCE($6, price),
         available_days = COALESCE($7, available_days), email = COALESCE($8, email),
         phone = COALESCE($9, phone), images = COALESCE($10, images),
         address = COALESCE($11, address), hours = COALESCE($12, hours),
         amenities = COALESCE($13, amenities), instagram = COALESCE($14, instagram),
         website = COALESCE($15, website), institute_id = $16::uuid, kind = $17
       WHERE user_id = $18 RETURNING *`,
      [...fields, kind === 'profesor' ? instituteId : null, kind, userId]
    )).rows[0];
  } else {
    // La ficha nueva queda pendiente: se publica cuando se acredita el primer pago del abono.
    teacher = (await pool.query(
      `INSERT INTO teachers
         (user_id, name, specialty, discipline, location, bio, price, available_days, email, phone,
          images, address, hours, amenities, instagram, website, institute_id, kind,
          rating, review_count, plan, plan_active, status, impressions)
       VALUES ($18, $1, $2, COALESCE($3, 'Yoga'), $4, $5, COALESCE($6, '$8.000/clase'),
               COALESCE($7::text[], '{}'), COALESCE($8, $19), $9, COALESCE($10::text[], '{}'), $11, $12,
               COALESCE($13::text[], '{}'), $14, $15, $16::uuid, $17, 0, 0, 'ninguno', false, 'pendiente', 0)
       RETURNING *`,
      [...fields, kind === 'profesor' ? instituteId : null, kind, userId, user.email]
    )).rows[0];
  }

  res.json({ success: true, teacher: teacherDTO(teacher), userProfile: profileDTO(user, teacher) });
}));

app.get('/api/user/teacher-stats', auth(), h(async (req, res) => {
  const empty = { impressions: 0, visitors: [], bookings: 0, rating: 0, reviews: 0 };
  const teacher = await getTeacherByUser(req.user!.id);
  if (!teacher) return res.json(empty);

  const [bookings, visitors] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total FROM bookings WHERE teacher_id = $1 AND status <> 'cancelada'`,
      [teacher.id]
    ),
    pool.query(
      `SELECT visitor_name AS name, created_at AS date FROM teacher_visits
       WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [teacher.id]
    ),
  ]);

  res.json({
    impressions: teacher.impressions || 0,
    visitors: visitors.rows,
    bookings: bookings.rows[0].total,
    rating: Number(teacher.rating) || 0,
    reviews: Number(teacher.review_count) || 0,
    status: teacher.status,
    plan: teacher.plan,
    plan_active: teacher.plan_active,
    plan_expires_at: teacher.plan_expires_at,
  });
}));

// ─── Bookings ─────────────────────────────────────────────────────────────────

app.post('/api/bookings', auth(), h(async (req, res) => {
  const teacherId = req.body.teacherId || req.body.teacher_id;
  const date = String(req.body.date || '');
  const time = String(req.body.time || '');
  if (!isUuid(teacherId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Elegí profesor, fecha y horario' });
  }
  if (date < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ error: 'La fecha ya pasó' });
  }

  const teacherResult = await pool.query(`SELECT * FROM teachers WHERE id = $1 AND status = 'activo'`, [teacherId]);
  const teacher = teacherResult.rows[0];
  if (!teacher) return res.status(404).json({ error: 'Profesor no encontrado' });
  if (teacher.user_id === req.user!.id) return res.status(400).json({ error: 'No podés reservar tu propia clase' });

  // Omia no procesa el pago de las clases: se acuerda y se paga directo con el profesional.
  // La solicitud queda registrada y el profesional recibe un aviso por mail.
  const result = await pool.query(
    `INSERT INTO bookings (student_id, teacher_id, teacher_name, date, time, price, status, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'solicitada', 'directo') RETURNING *`,
    [req.user!.id, teacherId, teacher.name, date, time, priceToNumber(teacher.price)]
  );
  const contactEmail = teacher.email || (teacher.user_id ? (await pool.query('SELECT email FROM users WHERE id = $1', [teacher.user_id])).rows[0]?.email : null);
  if (contactEmail) {
    void sendEmail(contactEmail, 'Tenés una nueva solicitud de clase en Omia',
      emailLayout('Nueva solicitud de clase',
        `<p><b>${escapeHtml(req.profile!.name || 'Un alumno')}</b> quiere reservar una clase el <b>${escapeHtml(date)}</b> a las <b>${escapeHtml(time)}</b>.</p>
         <p>Contacto: ${escapeHtml(req.profile!.email)}. Escribile para confirmar y acordar el pago: el 100% va directo a vos.</p>`,
        { label: 'Ver mis solicitudes', url: `${APP_URL}/perfil` }));
  }
  res.status(201).json({
    success: true,
    booking: bookingDTO(result.rows[0]),
    // El alumno recibe cómo contactar al profesional para cerrar la reserva.
    contact: { name: teacher.name, phone: teacher.phone || null, email: teacher.email || null, instagram: teacher.instagram || null },
  });
}));

// ─── Payments ─────────────────────────────────────────────────────────────────

// Aplica un pago aprobado. Es idempotente: si la transacción ya estaba aprobada no hace nada.
async function applyApprovedTransaction(txId: string, mpPaymentId: string | null): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE transactions SET status = 'aprobado', mp_payment_id = COALESCE($2, mp_payment_id), updated_at = NOW()
       WHERE id = $1 AND status <> 'aprobado' RETURNING *`,
      [txId, mpPaymentId]
    );
    const tx = updated.rows[0];
    if (!tx) {
      await client.query('ROLLBACK');
      return false;
    }

    if (tx.type === 'product') {
      for (const item of (tx.items || []) as { id: string; quantity: number }[]) {
        await client.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.quantity, item.id]);
      }
    }
    await client.query('COMMIT');
    if (tx.type === 'product') void notifyOrder(tx);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function notifyOrder(tx: Row): Promise<void> {
  try {
    const user = (await pool.query('SELECT email, name FROM users WHERE id = $1', [tx.user_id])).rows[0];
    const items = (tx.items || []) as { name: string; quantity: number; unit_price: number }[];
    const lines = items.map((i) => `<li>${i.quantity} × ${escapeHtml(i.name)} — ${formatARS(i.unit_price * i.quantity)}</li>`).join('');
    const ship = tx.shipping || {};
    const where = ship.method === 'retiro' ? 'Retiro por el punto acordado (te escribimos para coordinar).' : `Envío a ${escapeHtml(ship.address)}, ${escapeHtml(ship.city)} (${escapeHtml(ship.zip)}).`;
    if (user) {
      void sendEmail(user.email, 'Recibimos tu pedido en Omia',
        emailLayout('¡Gracias por tu compra!', `<ul>${lines}</ul><p><b>Total: ${formatARS(tx.amount)}</b></p><p>${where}</p><p>Te avisamos por mail cuando lo despachemos.</p>`));
    }
    if (CONTACT_EMAIL) {
      void sendEmail(CONTACT_EMAIL, `Nuevo pedido ${String(tx.id).slice(0, 8)} — ${formatARS(tx.amount)}`,
        emailLayout('Nuevo pedido pago', `<ul>${lines}</ul><p>Total ${formatARS(tx.amount)}</p><p>${escapeHtml(ship.name)} · ${escapeHtml(ship.phone)} · ${user ? escapeHtml(user.email) : ''}</p><p>${where}</p>`));
    }
  } catch (err) {
    console.error('[pedido] No se pudo avisar:', (err as Error).message);
  }
}

// Consulta el pago en Mercado Pago y, si está aprobado y coincide con la transacción, lo aplica.
async function verifyMercadoPagoPayment(paymentId: string, expectedTxId?: string): Promise<{ ok: boolean; status: string }> {
  if (!mp) return { ok: false, status: 'sin_credenciales' };
  const payment = await new Payment(mp).get({ id: paymentId });
  const txId = payment.external_reference || '';
  if (!isUuid(txId) || (expectedTxId && txId !== expectedTxId)) return { ok: false, status: 'referencia_invalida' };

  const txResult = await pool.query('SELECT * FROM transactions WHERE id = $1', [txId]);
  const tx = txResult.rows[0];
  if (!tx) return { ok: false, status: 'transaccion_inexistente' };

  if (payment.status === 'approved') {
    if (payment.currency_id !== 'ARS' || Number(payment.transaction_amount) < Number(tx.amount)) {
      console.error(`[MP] Monto no coincide en pago ${paymentId}: ${payment.transaction_amount} vs ${tx.amount}`);
      return { ok: false, status: 'monto_invalido' };
    }
    await applyApprovedTransaction(txId, String(paymentId));
    return { ok: true, status: 'approved' };
  }
  if (payment.status === 'rejected' || payment.status === 'cancelled') {
    await pool.query(
      `UPDATE transactions SET status = 'rechazado', mp_payment_id = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pendiente'`,
      [txId, String(paymentId)]
    );
  }
  return { ok: false, status: payment.status || 'desconocido' };
}

app.post('/api/payments/mercadopago', auth(), h(async (req, res) => {
  const userId = req.user!.id;
  const type = req.body.type === 'shop_order' ? 'product' : String(req.body.type || '');

  // El monto y el título se calculan siempre acá; lo que mande el navegador se ignora.
  let amount = 0;
  let title = '';
  let itemRef: string | null = null;
  let orderItems: { id: string; name: string; quantity: number; unit_price: number }[] | null = null;
  let shipping: Row | null = null;
  let shippingCost = 0;

  if (type === 'product') {
    const requested: { id: string; quantity: number }[] = (Array.isArray(req.body.items) ? req.body.items : [])
      .map((i: Row) => ({ id: String(i.id), quantity: Math.floor(Number(i.quantity)) }))
      .filter((i: { id: string; quantity: number }) => isUuid(i.id) && i.quantity > 0 && i.quantity <= 99);
    if (!requested.length) return res.status(400).json({ error: 'El carrito está vacío' });

    const products = (await pool.query('SELECT * FROM products WHERE active = true AND id = ANY($1::uuid[])', [
      requested.map((i) => i.id),
    ])).rows;
    orderItems = [];
    for (const item of requested) {
      const product = products.find((p) => p.id === item.id);
      if (!product) return res.status(400).json({ error: 'Uno de los productos ya no está disponible' });
      if (Number(product.stock) < item.quantity) return res.status(409).json({ error: `No hay stock suficiente de "${product.name}"` });
      orderItems.push({ id: product.id, name: product.name, quantity: item.quantity, unit_price: Number(product.price) });
    }
    const ship = req.body.shipping || {};
    shipping = {
      name: String(ship.name || '').trim().slice(0, 120),
      phone: String(ship.phone || '').trim().slice(0, 40),
      address: String(ship.address || '').trim().slice(0, 200),
      city: String(ship.city || '').trim().slice(0, 100),
      province: String(ship.province || '').trim().slice(0, 100),
      zip: String(ship.zip || '').trim().slice(0, 12),
      method: ship.method === 'retiro' ? 'retiro' : 'envio',
    };
    if (!shipping.name || !shipping.phone || (shipping.method === 'envio' && (!shipping.address || !shipping.city || !shipping.zip))) {
      return res.status(400).json({ error: 'Completá tus datos de contacto y de entrega' });
    }
    const subtotal = orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    shippingCost = shipping.method === 'retiro' ? 0 : await getShippingCost(subtotal);
    amount = subtotal + shippingCost;
    title = `Compra Omia Shop (${orderItems.length} ${orderItems.length === 1 ? 'producto' : 'productos'})`;
  } else {
    return res.status(400).json({ error: 'Tipo de pago inválido' });
  }

  if (!(amount > 0)) return res.status(400).json({ error: 'No se pudo calcular el importe' });
  if (!mp && !SIMULATED_PAYMENTS) {
    return res.status(503).json({ error: 'Los pagos no están disponibles en este momento. Probá más tarde.' });
  }

  const tx = (await pool.query(
    `INSERT INTO transactions (user_id, user_name, type, amount, description, item_id, items, shipping, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente') RETURNING id`,
    [userId, req.profile!.name || '', type, amount, title, itemRef, orderItems ? JSON.stringify(orderItems) : null,
     shipping ? JSON.stringify({ ...shipping, cost: shippingCost }) : null]
  )).rows[0];

  const backUrl = (status: string) =>
    `${APP_URL}/perfil?payment=${status}&type=${type}&itemId=${encodeURIComponent(itemRef || '')}&tx=${tx.id}`;

  if (!mp) {
    const params = new URLSearchParams({ type, itemId: itemRef || '', title, price: String(amount), tx: tx.id });
    return res.json({ success: true, checkoutUrl: `${APP_URL}/checkout-simulator?${params}`, transactionId: tx.id, isMock: true });
  }

  try {
    const mpItems = [
      ...(orderItems || []).map((i) => ({ id: i.id, title: i.name, quantity: i.quantity, unit_price: i.unit_price, currency_id: 'ARS' })),
      ...(shippingCost > 0 ? [{ id: 'envio', title: 'Envío', quantity: 1, unit_price: shippingCost, currency_id: 'ARS' }] : []),
    ];

    const preference = await new Preference(mp).create({
      body: {
        items: mpItems,
        payer: { email: req.profile!.email },
        external_reference: tx.id,
        back_urls: { success: backUrl('success'), pending: backUrl('pending'), failure: backUrl('failure') },
        // Mercado Pago solo acepta el retorno automático con URLs https.
        ...(APP_URL.startsWith('https://') ? { auto_return: 'approved' as const } : {}),
        ...(API_URL ? { notification_url: `${API_URL}/api/webhooks/mercadopago` } : {}),
        metadata: { transaction_id: tx.id, user_id: userId, type },
      },
    });
    await pool.query('UPDATE transactions SET mp_preference_id = $1 WHERE id = $2', [preference.id, tx.id]);
    res.json({ success: true, checkoutUrl: preference.init_point, preferenceId: preference.id, transactionId: tx.id, isMock: false });
  } catch (err) {
    console.error('[MP preference create error]', err);
    await pool.query(`UPDATE transactions SET status = 'rechazado', updated_at = NOW() WHERE id = $1`, [tx.id]);
    res.status(502).json({ error: 'No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos.' });
  }
}));

// El sitio llama acá al volver de Mercado Pago. Nunca se confía en el navegador:
// el pago se consulta en Mercado Pago antes de activar nada.
app.post('/api/payments/confirm', auth(), h(async (req, res) => {
  const txId = req.body.tx || req.body.transactionId;
  const paymentId = String(req.body.payment_id || req.body.paymentId || '').trim();
  if (!isUuid(txId)) return res.status(400).json({ error: 'Falta la referencia del pago' });

  const tx = (await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [txId, req.user!.id])).rows[0];
  if (!tx) return res.status(404).json({ error: 'Pago no encontrado' });
  if (tx.status === 'aprobado') return res.json({ success: true, status: 'approved', type: tx.type });

  if (SIMULATED_PAYMENTS) {
    await applyApprovedTransaction(tx.id, null);
    return res.json({ success: true, status: 'approved', type: tx.type, isMock: true });
  }
  if (!/^\d+$/.test(paymentId)) {
    return res.status(202).json({ success: false, status: 'pending', error: 'Todavía no recibimos la confirmación del pago' });
  }

  const result = await verifyMercadoPagoPayment(paymentId, tx.id);
  if (result.ok) return res.json({ success: true, status: 'approved', type: tx.type });
  res.status(202).json({ success: false, status: result.status, error: 'El pago todavía no figura como aprobado' });
}));

// ─── Suscripciones mensuales (Mercado Pago PreApproval) ──────────────────────

const MP_STATUS: Record<string, string> = { authorized: 'activa', pending: 'pendiente', paused: 'pausada', cancelled: 'cancelada' };

async function mpApi(pathname: string): Promise<Row> {
  const response = await fetch(`https://api.mercadopago.com${pathname}`, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } });
  if (!response.ok) throw new Error(`Mercado Pago respondió ${response.status} en ${pathname}`);
  return (await response.json()) as Row;
}

// Trae el estado real de la suscripción desde Mercado Pago y lo refleja en la ficha del profesional.
// Es idempotente: se puede llamar por cada aviso, por la vuelta del checkout o por el proceso diario.
async function syncSubscription(subId: string, simulate = false): Promise<Row | null> {
  const sub = (await pool.query('SELECT * FROM subscriptions WHERE id = $1', [subId])).rows[0];
  if (!sub) return null;

  let status = sub.status as string;
  let nextAt: Date | null = sub.next_payment_at;
  let lastAt: Date | null = sub.last_payment_at;

  if (simulate && !mp) {
    status = 'activa';
    nextAt = new Date(Date.now() + PLAN_DAYS * 86400000);
    lastAt = new Date();
  } else if (mp && sub.mp_preapproval_id) {
    const remote = await new PreApproval(mp).get({ id: sub.mp_preapproval_id });
    status = MP_STATUS[remote.status || ''] || status;
    nextAt = remote.next_payment_date ? new Date(remote.next_payment_date) : nextAt;
    lastAt = remote.summarized?.last_charged_date ? new Date(remote.summarized.last_charged_date) : lastAt;
  } else {
    return sub;
  }

  const updated = (await pool.query(
    `UPDATE subscriptions SET status = $2, next_payment_at = $3, last_payment_at = $4, updated_at = NOW(),
       cancelled_at = CASE WHEN $2 = 'cancelada' THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END
     WHERE id = $1 RETURNING *`,
    [sub.id, status, nextAt, lastAt]
  )).rows[0];

  const user = (await pool.query('SELECT * FROM users WHERE id = $1', [sub.user_id])).rows[0];
  if (status === 'activa') {
    // Mientras Mercado Pago siga cobrando, el plan se renueva solo. Si un cobro falla se da unos días de gracia.
    const until = new Date((nextAt ? nextAt.getTime() : Date.now() + PLAN_DAYS * 86400000) + GRACE_DAYS * 86400000);
    await pool.query(
      `UPDATE teachers SET plan = $1, plan_active = true, plan_expires_at = $2,
         status = CASE WHEN status = 'pendiente' THEN 'activo' ELSE status END
       WHERE id = $3`,
      [sub.plan, until, sub.teacher_id]
    );
    if (sub.status !== 'activa' && user) void mails.subscriptionActive(user, sub.plan, Number(sub.amount), nextAt);
  } else if (status === 'cancelada') {
    // Lo ya pagado se respeta: el plan sigue hasta el fin del período, sin renovarse.
    if (sub.teacher_id) {
      await pool.query(
        `UPDATE teachers SET plan_expires_at = LEAST(COALESCE(plan_expires_at, NOW()), GREATEST($2::timestamptz, NOW()))
         WHERE id = $1`,
        [sub.teacher_id, nextAt]
      );
    }
    if (sub.status !== 'cancelada' && user) void mails.subscriptionCancelled(user, sub.plan, nextAt);
  }
  return updated;
}

// Registra un cobro mensual de la suscripción (una sola vez por pago) y avisa por mail.
async function recordSubscriptionPayment(sub: Row, paymentId: string, approved: boolean): Promise<void> {
  if (approved) {
    const inserted = await pool.query(
      `INSERT INTO transactions (user_id, user_name, type, amount, description, item_id, mp_payment_id, status, subscription_id)
       SELECT $1, u.name, 'subscription', $2, $3, $4, $5, 'aprobado', $6 FROM users u WHERE u.id = $1
       ON CONFLICT DO NOTHING RETURNING id`,
      [sub.user_id, sub.amount, `Membresía Omia - ${PLANS[sub.plan]} (mensual)`, sub.plan, paymentId, sub.id]
    );
    if (inserted.rows[0]) {
      const user = (await pool.query('SELECT * FROM users WHERE id = $1', [sub.user_id])).rows[0];
      if (user) void mails.paymentOk(user, sub.plan, Number(sub.amount));
    }
    return;
  }
  // Un rechazo avisa una sola vez por pago.
  const first = await pool.query(`INSERT INTO webhook_events (id, topic) VALUES ($1, 'pago_rechazado') ON CONFLICT DO NOTHING RETURNING id`, [`rej:${paymentId}`]);
  if (first.rows[0]) {
    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [sub.user_id])).rows[0];
    if (user) void mails.paymentFailed(user, sub.plan);
  }
}

app.post('/api/subscriptions/checkout', auth(), h(async (req, res) => {
  const plan = String(req.body.plan || '');
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plan inexistente' });
  const teacher = await getTeacherByUser(req.user!.id);
  if (!teacher) {
    return res.status(409).json({ error: 'Primero completá y guardá tu perfil público. Después podés activar el plan.' });
  }
  if (plan === 'institucional' && teacher.kind !== 'instituto') {
    return res.status(400).json({ error: 'El Plan Institucional es solo para institutos y estudios' });
  }
  if (!mp && !SIMULATED_PAYMENTS) {
    return res.status(503).json({ error: 'Los pagos no están disponibles en este momento. Probá más tarde.' });
  }
  const current = (await pool.query(`SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('activa', 'pausada') LIMIT 1`, [req.user!.id])).rows[0];
  if (current) return res.status(409).json({ error: 'Ya tenés una suscripción. Podés cambiar de plan o darte de baja desde tu panel.' });

  const amount = (await getPlanPrices())[plan] || 0;
  if (!(amount > 0)) return res.status(400).json({ error: 'No se pudo calcular el importe' });

  // Los intentos sin completar quedan descartados para no acumular suscripciones pendientes.
  await pool.query(`UPDATE subscriptions SET status = 'cancelada', cancelled_at = NOW() WHERE user_id = $1 AND status = 'pendiente'`, [req.user!.id]);
  const sub = (await pool.query(
    `INSERT INTO subscriptions (user_id, teacher_id, plan, amount) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user!.id, teacher.id, plan, amount]
  )).rows[0];

  if (!mp) {
    const params = new URLSearchParams({ type: 'subscription', itemId: plan, title: `Membresía Omia - ${PLANS[plan]} (mensual)`, price: String(amount), sub: sub.id });
    return res.json({ success: true, checkoutUrl: `${APP_URL}/checkout-simulator?${params}`, subscriptionId: sub.id, isMock: true });
  }

  try {
    const preapproval = await new PreApproval(mp).create({
      body: {
        reason: `Membresía Omia - ${PLANS[plan]}`,
        external_reference: sub.id,
        payer_email: req.profile!.email,
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'ARS' },
        // Mercado Pago solo acepta back_url con https.
        ...(APP_URL.startsWith('https://') ? { back_url: `${APP_URL}/perfil?subscription=${sub.id}` } : {}),
        status: 'pending',
      },
    });
    await pool.query('UPDATE subscriptions SET mp_preapproval_id = $1 WHERE id = $2', [preapproval.id, sub.id]);
    res.json({ success: true, checkoutUrl: preapproval.init_point, subscriptionId: sub.id, isMock: false });
  } catch (err) {
    console.error('[MP preapproval create error]', err);
    await pool.query(`UPDATE subscriptions SET status = 'cancelada', cancelled_at = NOW() WHERE id = $1`, [sub.id]);
    res.status(502).json({ error: 'No pudimos iniciar la suscripción con Mercado Pago. Probá de nuevo en unos minutos.' });
  }
}));

// Estado de la suscripción y sus cobros, para el panel del profesional.
app.get('/api/subscriptions/me', auth(), h(async (req, res) => {
  const subscription = (await pool.query(
    `SELECT * FROM subscriptions WHERE user_id = $1 AND status <> 'cancelada' OR (user_id = $1 AND cancelled_at > NOW() - INTERVAL '90 days')
     ORDER BY (status IN ('activa', 'pausada')) DESC, created_at DESC LIMIT 1`,
    [req.user!.id]
  )).rows[0] || null;
  const payments = (await pool.query(
    `SELECT id, amount, description, status, created_at FROM transactions
     WHERE user_id = $1 AND type = 'subscription' AND status = 'aprobado' ORDER BY created_at DESC LIMIT 24`,
    [req.user!.id]
  )).rows;
  res.json({ subscription, payments });
}));

// Al volver del checkout el sitio pide refrescar el estado. Nunca se confía en lo que diga el navegador:
// el estado sale de Mercado Pago (o, en desarrollo sin credenciales, del simulador).
app.post('/api/subscriptions/sync', auth(), h(async (req, res) => {
  const subId = req.body.subscriptionId;
  const sub = isUuid(subId)
    ? (await pool.query('SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2', [subId, req.user!.id])).rows[0]
    : (await pool.query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user!.id])).rows[0];
  if (!sub) return res.status(404).json({ error: 'No encontramos tu suscripción' });
  const synced = await syncSubscription(sub.id, SIMULATED_PAYMENTS);
  res.json({ success: true, subscription: synced, pending: synced?.status === 'pendiente' });
}));

app.post('/api/subscriptions/cancel', auth(), h(async (req, res) => {
  const sub = (await pool.query(`SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('activa', 'pausada', 'pendiente') ORDER BY created_at DESC LIMIT 1`, [req.user!.id])).rows[0];
  if (!sub) return res.status(404).json({ error: 'No tenés una suscripción para dar de baja' });
  if (mp && sub.mp_preapproval_id) {
    try {
      await new PreApproval(mp).update({ id: sub.mp_preapproval_id, body: { status: 'cancelled' } });
    } catch (err) {
      console.error('[MP preapproval cancel error]', err);
      return res.status(502).json({ error: 'No pudimos procesar la baja con Mercado Pago. Probá de nuevo en unos minutos.' });
    }
  }
  const updated = (await pool.query(
    `UPDATE subscriptions SET status = 'cancelada', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`, [sub.id]
  )).rows[0];
  if (sub.teacher_id) {
    await pool.query(
      `UPDATE teachers SET plan_expires_at = LEAST(COALESCE(plan_expires_at, NOW()), GREATEST($2::timestamptz, NOW())) WHERE id = $1`,
      [sub.teacher_id, sub.next_payment_at]
    );
  }
  if (sub.status !== 'pendiente') void mails.subscriptionCancelled(req.profile!, sub.plan, sub.next_payment_at);
  res.json({ success: true, subscription: updated });
}));

// Cambio de plan: el nuevo importe rige desde el próximo cobro; los beneficios, desde ya.
app.post('/api/subscriptions/change', auth(), h(async (req, res) => {
  const plan = String(req.body.plan || '');
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plan inexistente' });
  const sub = (await pool.query(`SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'activa' LIMIT 1`, [req.user!.id])).rows[0];
  if (!sub) return res.status(404).json({ error: 'No tenés una suscripción activa' });
  if (sub.plan === plan) return res.status(400).json({ error: 'Ya estás en ese plan' });
  const teacher = await getTeacherByUser(req.user!.id);
  if (plan === 'institucional' && teacher?.kind !== 'instituto') {
    return res.status(400).json({ error: 'El Plan Institucional es solo para institutos y estudios' });
  }
  const amount = (await getPlanPrices())[plan] || 0;
  if (!(amount > 0)) return res.status(400).json({ error: 'No se pudo calcular el importe' });
  if (mp && sub.mp_preapproval_id) {
    try {
      await new PreApproval(mp).update({ id: sub.mp_preapproval_id, body: { auto_recurring: { transaction_amount: amount, currency_id: 'ARS' } } });
    } catch (err) {
      console.error('[MP preapproval update error]', err);
      return res.status(502).json({ error: 'No pudimos cambiar el plan con Mercado Pago. Probá de nuevo en unos minutos.' });
    }
  }
  const updated = (await pool.query(
    `UPDATE subscriptions SET plan = $2, amount = $3, updated_at = NOW() WHERE id = $1 RETURNING *`, [sub.id, plan, amount]
  )).rows[0];
  if (sub.teacher_id) await pool.query('UPDATE teachers SET plan = $1 WHERE id = $2', [plan, sub.teacher_id]);
  res.json({ success: true, subscription: updated });
}));

// Valida la firma que manda Mercado Pago (cabecera x-signature) cuando hay clave configurada.
function validWebhookSignature(req: Request, dataId: string): boolean {
  if (!MP_WEBHOOK_SECRET) return true;
  const parts = Object.fromEntries(
    String(req.headers['x-signature'] || '').split(',').map((p) => p.trim().split('=') as [string, string])
  );
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${req.headers['x-request-id'] || ''};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

// Aviso de Mercado Pago. El cuerpo solo trae un id: el estado real se consulta siempre en su API.
app.post('/api/webhooks/mercadopago', h(async (req, res) => {
  const topic = String(req.body?.type || req.query.type || req.query.topic || '');
  const dataId = String(req.body?.data?.id || req.query['data.id'] || req.query.id || '');
  const known = ['payment', 'subscription_preapproval', 'subscription_authorized_payment'];
  if (!known.includes(topic) || !dataId || !/^[\w-]+$/.test(dataId)) return res.sendStatus(200);
  if (!validWebhookSignature(req, dataId)) return res.sendStatus(401);
  if (!mp) return res.sendStatus(200);

  try {
    if (topic === 'payment') {
      if (/^\d+$/.test(dataId)) {
        const result = await verifyMercadoPagoPayment(dataId);
        console.log(`[MP webhook] pago ${dataId}: ${result.status}`);
      }
    } else if (topic === 'subscription_preapproval') {
      const sub = (await pool.query('SELECT id FROM subscriptions WHERE mp_preapproval_id = $1', [dataId])).rows[0];
      if (sub) await syncSubscription(sub.id);
      console.log(`[MP webhook] suscripción ${dataId}: ${sub ? 'sincronizada' : 'desconocida'}`);
    } else {
      // subscription_authorized_payment: un cobro mensual (aprobado o rechazado) de una suscripción.
      const authorized = await mpApi(`/authorized_payments/${encodeURIComponent(dataId)}`);
      const sub = (await pool.query('SELECT * FROM subscriptions WHERE mp_preapproval_id = $1', [String(authorized.preapproval_id || '')])).rows[0];
      if (sub) {
        const paymentId = String(authorized.payment?.id || dataId);
        const paymentStatus = String(authorized.payment?.status || authorized.status || '');
        if (paymentStatus === 'approved' || authorized.status === 'processed') {
          await recordSubscriptionPayment(sub, paymentId, true);
        } else if (paymentStatus === 'rejected' || authorized.status === 'cancelled') {
          await recordSubscriptionPayment(sub, paymentId, false);
        }
        await syncSubscription(sub.id);
      }
      console.log(`[MP webhook] cobro de suscripción ${dataId}: ${sub ? authorized.status : 'suscripción desconocida'}`);
    }
  } catch (err) {
    console.error('[MP webhook]', err);
    return res.sendStatus(500); // Mercado Pago reintenta
  }
  res.sendStatus(200);
}));

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get('/api/admin/dashboard', requireAdmin, h(async (_req, res) => {
  const [users, teachers, bookings, revenue, recentUsers, monthly] = await Promise.all([
    pool.query('SELECT COUNT(*) AS n FROM users'),
    pool.query(`SELECT COUNT(*) AS n FROM teachers WHERE status = 'activo'`),
    pool.query('SELECT COUNT(*) AS n FROM bookings'),
    pool.query(`SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'aprobado' GROUP BY type`),
    pool.query('SELECT name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
    pool.query(
      `SELECT to_char(m, 'YYYY-MM') AS month,
              (SELECT COUNT(*) FROM bookings b WHERE date_trunc('month', b.created_at) = m) AS bookings,
              (SELECT COUNT(*) FROM transactions t WHERE t.status = 'aprobado' AND date_trunc('month', t.created_at) = m) AS transactions
       FROM generate_series(date_trunc('month', NOW()) - interval '5 months', date_trunc('month', NOW()), interval '1 month') AS m
       ORDER BY m`
    ),
  ]);
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const byType = Object.fromEntries(revenue.rows.map((r) => [r.type, Number(r.total)]));
  res.json({
    totalUsers: users.rows[0].n,
    totalTeachers: teachers.rows[0].n,
    totalBookings: bookings.rows[0].n,
    revenue: Object.values(byType).reduce((s: number, n) => s + (n as number), 0),
    revenueByType: {
      subscriptions: byType.subscription || 0,
      bookings: byType.booking || 0,
      products: byType.product || 0,
    },
    recentUsers: recentUsers.rows,
    monthly: monthly.rows.map((r) => ({
      label: MONTHS[parseInt(r.month.slice(5), 10) - 1],
      bookings: r.bookings,
      transactions: r.transactions,
    })),
  });
}));

app.get('/api/admin/config', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM admin_config ORDER BY key')).rows);
}));

app.put('/api/admin/config', requireAdmin, h(async (req, res) => {
  const { key, value, label } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'key y value son requeridos' });
  const result = await pool.query(
    `INSERT INTO admin_config (key, value, label, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
       label = COALESCE(EXCLUDED.label, admin_config.label), updated_at = NOW()
     RETURNING *`,
    [key, String(value), label || null]
  );
  res.json(result.rows[0]);
}));

app.get('/api/admin/users', requireAdmin, h(async (_req, res) => {
  const result = await pool.query(
    'SELECT id, email, name, avatar_url, bio, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(result.rows);
}));

app.put('/api/admin/users/:id/role', requireAdmin, h(async (req, res) => {
  const { role } = req.body;
  if (![...PUBLIC_ROLES, 'admin'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  const result = await pool.query(
    'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, avatar_url, bio, role, created_at',
    [role, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(result.rows[0]);
}));

// Alta y edición genéricas con lista blanca de columnas.
const TEACHER_FIELDS = [
  'user_id', 'name', 'specialty', 'discipline', 'location', 'bio', 'price', 'available_days', 'email',
  'phone', 'images', 'plan', 'plan_active', 'plan_expires_at', 'status', 'impressions', 'kind',
  'address', 'hours', 'amenities', 'instagram', 'website', 'institute_id',
];
const PRODUCT_FIELDS = ['name', 'description', 'price', 'images', 'category', 'stock', 'active', 'features', 'discipline', 'badge'];

function pickFields(body: Row, allowed: string[]): { cols: string[]; vals: unknown[] } {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      cols.push(key);
      vals.push(body[key] === '' && key.endsWith('_id') ? null : body[key]);
    }
  }
  return { cols, vals };
}

async function insertRow(table: string, body: Row, allowed: string[]): Promise<Row> {
  const { cols, vals } = pickFields(body, allowed);
  const result = await pool.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    vals
  );
  return result.rows[0];
}

async function updateRow(table: string, id: string, body: Row, allowed: string[]): Promise<Row | null> {
  const { cols, vals } = pickFields(body, allowed);
  if (!cols.length) return null;
  const result = await pool.query(
    `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${cols.length + 1} RETURNING *`,
    [...vals, id]
  );
  return result.rows[0] || null;
}

app.get('/api/admin/teachers', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM teachers ORDER BY created_at DESC')).rows.map(teacherDTO));
}));

app.post('/api/admin/teachers', requireAdmin, h(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  // Lo que carga el admin se publica directo, salvo que indique otro estado.
  const body = { ...req.body, plan: PLANS[req.body.plan] ? req.body.plan : 'ninguno', status: req.body.status || 'activo' };
  res.status(201).json(teacherDTO(await insertRow('teachers', body, TEACHER_FIELDS)));
}));

app.put('/api/admin/teachers/:id', requireAdmin, h(async (req, res) => {
  const teacher = await updateRow('teachers', req.params.id, req.body, TEACHER_FIELDS.filter((f) => f !== 'user_id'));
  if (!teacher) return res.status(404).json({ error: 'Profesor no encontrado' });
  res.json(teacherDTO(teacher));
}));

app.delete('/api/admin/teachers/:id', requireAdmin, h(async (req, res) => {
  await pool.query('DELETE FROM teachers WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/admin/products', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM products ORDER BY created_at DESC')).rows.map(productDTO));
}));

app.post('/api/admin/products', requireAdmin, h(async (req, res) => {
  if (!req.body.name || req.body.price === undefined) return res.status(400).json({ error: 'name y price son requeridos' });
  res.status(201).json(productDTO(await insertRow('products', req.body, PRODUCT_FIELDS)));
}));

app.put('/api/admin/products/:id', requireAdmin, h(async (req, res) => {
  const product = await updateRow('products', req.params.id, req.body, PRODUCT_FIELDS);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(productDTO(product));
}));

app.delete('/api/admin/products/:id', requireAdmin, h(async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/admin/transactions', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200')).rows);
}));

app.get('/api/admin/bookings', requireAdmin, h(async (_req, res) => {
  const result = await pool.query(
    `SELECT b.*, u.name AS student_name, u.email AS student_email, t.name AS listing_name
     FROM bookings b
     LEFT JOIN users u ON u.id = b.student_id
     LEFT JOIN teachers t ON t.id = b.teacher_id
     ORDER BY b.created_at DESC LIMIT 200`
  );
  res.json(result.rows.map((b) => ({
    ...b,
    booking_date: b.date,
    profiles: { name: b.student_name, email: b.student_email },
    teachers: { name: b.listing_name || b.teacher_name },
  })));
}));

app.put('/api/admin/bookings/:id', requireAdmin, h(async (req, res) => {
  const booking = await updateRow('bookings', req.params.id, req.body, ['status', 'payment_status', 'date', 'time', 'price']);
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(booking);
}));

app.delete('/api/admin/bookings/:id', requireAdmin, h(async (req, res) => {
  await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/admin/reviews', requireAdmin, h(async (_req, res) => {
  const result = await pool.query(
    `SELECT r.*, u.name AS account_name, u.email AS account_email, t.name AS teacher_name
     FROM reviews r
     LEFT JOIN users u ON u.id = r.student_id
     LEFT JOIN teachers t ON t.id = r.teacher_id
     ORDER BY r.created_at DESC LIMIT 300`
  );
  res.json(result.rows.map((r) => ({
    ...r,
    user_name: r.account_name || r.student_name,
    text: r.comment,
    profiles: { name: r.account_name || r.student_name, email: r.account_email },
    teachers: { name: r.teacher_name },
  })));
}));

app.delete('/api/admin/reviews/:id', requireAdmin, h(async (req, res) => {
  const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING teacher_id', [req.params.id]);
  if (result.rows[0]?.teacher_id) await recalcRating(result.rows[0].teacher_id);
  res.json({ success: true });
}));

// ─── Contenido editable del sitio ────────────────────────────────────────────

const CONTENT_KEY = /^[a-z0-9_]+(\.[a-z0-9_]+){1,5}$/;

// Todo lo que el administrador cambió. El sitio usa su texto original para lo que no figure acá.
app.get('/api/content', h(async (_req, res) => {
  const rows = (await pool.query('SELECT key, value FROM site_content')).rows;
  // no-cache + ETag: el navegador siempre consulta, pero si no hubo cambios la respuesta es un 304 liviano.
  res.set('Cache-Control', 'no-cache').json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}));

// Cambia varios valores a la vez. Un valor null vuelve al texto original.
app.put('/api/admin/content', requireAdmin, h(async (req, res) => {
  const values = req.body?.values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) return res.status(400).json({ error: 'Datos inválidos' });
  const entries = Object.entries(values);
  if (!entries.length || entries.length > 300) return res.status(400).json({ error: 'Cantidad de cambios inválida' });
  for (const [key, value] of entries) {
    if (!CONTENT_KEY.test(key)) return res.status(400).json({ error: `Clave inválida: ${key}` });
    if (value !== null && JSON.stringify(value).length > 400_000) return res.status(400).json({ error: `El contenido de "${key}" es demasiado largo` });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of entries) {
      if (value === null) await client.query('DELETE FROM site_content WHERE key = $1', [key]);
      else await client.query(
        `INSERT INTO site_content (key, value, updated_by) VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [key, JSON.stringify(value), req.user!.id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  const rows = (await pool.query('SELECT key, value FROM site_content')).rows;
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}));

// Subida de imágenes del sitio: llegan como data URL, se guardan y se sirven con caché larga.
const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
app.post('/api/admin/media', requireAdmin, h(async (req, res) => {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
  if (!match || !MEDIA_TYPES.includes(match[1])) return res.status(400).json({ error: 'Subí una imagen PNG, JPG o WebP' });
  const data = Buffer.from(match[2], 'base64');
  if (data.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'La imagen supera los 4 MB' });
  const row = (await pool.query(
    'INSERT INTO media (mime, data, name, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
    [match[1], data, String(req.body?.name || '').slice(0, 120) || null, req.user!.id]
  )).rows[0];
  res.status(201).json({ url: `/api/media/${row.id}` });
}));

app.get('/api/media/:id', h(async (req, res) => {
  if (!isUuid(req.params.id)) return res.sendStatus(404);
  const row = (await pool.query('SELECT mime, data FROM media WHERE id = $1', [req.params.id])).rows[0];
  if (!row) return res.sendStatus(404);
  res.set({ 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'Cross-Origin-Resource-Policy': 'cross-origin' }).send(row.data);
}));

// ─── Contacto, arrepentimiento y bajas (público) ─────────────────────────────

const contactLimiter = rateLimit(5, 60 * 60 * 1000);

app.post('/api/contact', contactLimiter, h(async (req, res) => {
  const kind = ['consulta', 'arrepentimiento', 'baja'].includes(req.body.kind) ? req.body.kind : 'consulta';
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 200);
  const name = String(req.body.name || '').trim().slice(0, 120);
  const message = String(req.body.message || '').trim().slice(0, 3000);
  const reference = String(req.body.reference || '').trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Ingresá un email válido' });
  if (message.length < 5 && kind === 'consulta') return res.status(400).json({ error: 'Escribinos tu consulta' });
  if (kind === 'arrepentimiento' && !reference) return res.status(400).json({ error: 'Indicá el número de pedido o el producto' });

  await pool.query(
    'INSERT INTO contact_messages (kind, name, email, message, reference) VALUES ($1, $2, $3, $4, $5)',
    [kind, name || null, email, message || '(sin mensaje)', reference || null]
  );
  const label = { consulta: 'Consulta', arrepentimiento: 'Botón de arrepentimiento', baja: 'Pedido de baja' }[kind as 'consulta'];
  if (CONTACT_EMAIL) {
    void sendEmail(CONTACT_EMAIL, `[Omia] ${label} de ${name || email}`,
      emailLayout(label, `<p><b>${escapeHtml(name)}</b> &lt;${escapeHtml(email)}&gt;</p>${reference ? `<p>Referencia: ${escapeHtml(reference)}</p>` : ''}<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`));
  }
  // Acuse de recibo: en arrepentimiento y baja es una obligación, no una cortesía.
  void sendEmail(email, `Recibimos tu ${kind === 'consulta' ? 'consulta' : kind === 'baja' ? 'pedido de baja' : 'pedido de arrepentimiento'}`,
    emailLayout('Recibimos tu mensaje', '<p>Lo vamos a responder dentro de las próximas 48 horas hábiles. Guardá este mail como constancia.</p>'));
  res.status(201).json({ success: true });
}));

// ─── Noticias (público) ──────────────────────────────────────────────────────

app.get('/api/articles', h(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 50);
  const result = await pool.query(
    `SELECT id, slug, title, excerpt, image, category, author, published_at FROM articles
     WHERE status = 'publicado' AND published_at <= NOW() ORDER BY published_at DESC LIMIT $1`, [limit]);
  res.json(result.rows);
}));

app.get('/api/articles/:slug', h(async (req, res) => {
  const article = (await pool.query(`SELECT * FROM articles WHERE slug = $1 AND status = 'publicado' AND published_at <= NOW()`, [req.params.slug])).rows[0];
  if (!article) return res.status(404).json({ error: 'Nota no encontrada' });
  res.json(article);
}));

// ─── Sitemap (se arma con lo que hay publicado) ──────────────────────────────

app.get('/sitemap.xml', h(async (_req, res) => {
  const site = (process.env.SITE_URL || APP_URL).replace(/\/$/, '');
  const [listings, articles] = await Promise.all([
    pool.query(`SELECT id, created_at FROM teachers WHERE status = 'activo'`),
    pool.query(`SELECT slug, COALESCE(updated_at, published_at) AS d FROM articles WHERE status = 'publicado' AND published_at <= NOW()`),
  ]);
  const fixed = ['', '/directorio', '/estudios', '/ranking', '/tienda', '/para-profes', '/noticias', '/nosotros', '/contacto', '/terminos', '/privacidad'];
  const url = (loc: string, extra = '') => `<url><loc>${escapeHtml(site + loc)}</loc>${extra}</url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    fixed.map((p) => url(p)).join('\n') + '\n' +
    listings.rows.map((r) => url(`/profesor/${r.id}`, `<lastmod>${new Date(r.created_at).toISOString().slice(0, 10)}</lastmod>`)).join('\n') + '\n' +
    articles.rows.map((r) => url(`/noticias/${r.slug}`, `<lastmod>${new Date(r.d).toISOString().slice(0, 10)}</lastmod>`)).join('\n') +
    '\n</urlset>\n';
  res.type('application/xml').send(xml);
}));

// ─── Admin: suscripciones, pedidos, noticias, mensajes ──────────────────────

app.get('/api/admin/subscriptions', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query(
    `SELECT s.*, u.email, u.name AS user_name FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 300`
  )).rows);
}));

app.get('/api/admin/orders', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query(
    `SELECT t.*, u.email FROM transactions t LEFT JOIN users u ON u.id = t.user_id
     WHERE t.type = 'product' AND t.status = 'aprobado' ORDER BY t.created_at DESC LIMIT 300`
  )).rows);
}));

app.put('/api/admin/orders/:id', requireAdmin, h(async (req, res) => {
  const fulfillment = String(req.body.fulfillment || '');
  if (!['pendiente', 'preparando', 'despachado', 'entregado', 'cancelado'].includes(fulfillment)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const tracking = req.body.tracking ? String(req.body.tracking).slice(0, 200) : null;
  const order = (await pool.query(
    `UPDATE transactions SET fulfillment = $2, tracking = COALESCE($3, tracking), updated_at = NOW()
     WHERE id = $1 AND type = 'product' RETURNING *`, [req.params.id, fulfillment, tracking]
  )).rows[0];
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (fulfillment === 'despachado') {
    const user = (await pool.query('SELECT email FROM users WHERE id = $1', [order.user_id])).rows[0];
    if (user) {
      void sendEmail(user.email, 'Tu pedido de Omia fue despachado',
        emailLayout('¡Tu pedido está en camino!', `<p>Despachamos tu compra.${order.tracking ? ` Código de seguimiento: <b>${escapeHtml(order.tracking)}</b>.` : ''}</p>`));
    }
  }
  res.json(order);
}));

app.get('/api/admin/articles', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM articles ORDER BY created_at DESC')).rows);
}));

const slugify = (t: string): string =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

app.post('/api/admin/articles', requireAdmin, h(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title || !body) return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  const status = req.body.status === 'publicado' ? 'publicado' : 'borrador';
  let slug = slugify(req.body.slug || title) || 'nota';
  if ((await pool.query('SELECT 1 FROM articles WHERE slug = $1', [slug])).rows[0]) slug = `${slug}-${Date.now().toString(36)}`;
  const article = (await pool.query(
    `INSERT INTO articles (slug, title, excerpt, body, image, category, author, status, published_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'General'), COALESCE($7, 'Equipo Omia'), $8, CASE WHEN $8 = 'publicado' THEN NOW() END) RETURNING *`,
    [slug, title, req.body.excerpt || null, body, req.body.image || null, req.body.category || null, req.body.author || null, status]
  )).rows[0];
  res.status(201).json(article);
}));

app.put('/api/admin/articles/:id', requireAdmin, h(async (req, res) => {
  const current = (await pool.query('SELECT * FROM articles WHERE id = $1', [req.params.id])).rows[0];
  if (!current) return res.status(404).json({ error: 'Nota no encontrada' });
  const status = req.body.status === 'publicado' ? 'publicado' : req.body.status === 'borrador' ? 'borrador' : current.status;
  const article = (await pool.query(
    `UPDATE articles SET title = COALESCE($2, title), excerpt = COALESCE($3, excerpt), body = COALESCE($4, body),
       image = COALESCE($5, image), category = COALESCE($6, category), author = COALESCE($7, author),
       status = $8, published_at = CASE WHEN $8 = 'publicado' THEN COALESCE(published_at, NOW()) ELSE published_at END,
       updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id, req.body.title || null, req.body.excerpt ?? null, req.body.body || null, req.body.image ?? null, req.body.category || null, req.body.author || null, status]
  )).rows[0];
  res.json(article);
}));

app.delete('/api/admin/articles/:id', requireAdmin, h(async (req, res) => {
  await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
  res.json({ success: true });
}));

app.get('/api/admin/messages', requireAdmin, h(async (_req, res) => {
  res.json((await pool.query('SELECT * FROM contact_messages ORDER BY handled ASC, created_at DESC LIMIT 300')).rows);
}));

app.put('/api/admin/messages/:id', requireAdmin, h(async (req, res) => {
  await pool.query('UPDATE contact_messages SET handled = $2 WHERE id = $1', [req.params.id, req.body.handled !== false]);
  res.json({ success: true });
}));

// ─── AI: Smart Search ─────────────────────────────────────────────────────────

app.post('/api/smart-search', aiLimiter, h(async (req, res) => {
  const query = String(req.body.query || '').trim().slice(0, 300);
  if (!query) return res.json(await listListings({}, 'profesor'));

  const teachers = await listListings({}, null);
  // Sin clave de IA (o si falla) se resuelve con una búsqueda por texto.
  const textSearch = () => {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return teachers.filter((t) => {
      const haystack = `${t.name} ${t.specialty} ${t.discipline} ${t.location} ${t.bio}`.toLowerCase();
      return words.some((w) => haystack.includes(w));
    });
  };
  if (!genai) return res.json(textSearch());

  try {
    const summary = teachers
      .map((t) => `ID:${t.id} | ${t.name} | ${t.specialty || ''} | ${t.discipline || ''} | ${t.location || ''} | Rating:${t.rating} | Precio:${t.price}`)
      .join('\n');
    const response = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Sos un buscador inteligente de profesores e institutos de yoga y pilates en Argentina.

Fichas disponibles:
${summary}

Consulta del usuario: "${query}"

Respondé SOLO con un array JSON de IDs relevantes, ordenados por relevancia, sin explicaciones.
Ejemplo: ["uuid1", "uuid2"]
Si ninguno coincide, respondé: []`,
    });
    const match = (response.text || '[]').match(/\[[\s\S]*\]/);
    const ids: string[] = match ? JSON.parse(match[0]) : [];
    res.json(ids.map((id) => teachers.find((t) => t.id === id)).filter(Boolean));
  } catch (err) {
    console.error('[POST /api/smart-search]', err);
    res.json(textSearch());
  }
}));

// ─── AI: Chat ─────────────────────────────────────────────────────────────────

app.post('/api/chat', aiLimiter, h(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 1500);
  if (!message) return res.status(400).json({ error: 'message es requerido' });
  if (!genai) return res.status(503).json({ error: 'Servicio de IA no disponible' });

  const [teachers, prices] = await Promise.all([
    pool.query(
      `SELECT id, name, kind, specialty, discipline, location, price, rating
       FROM teachers WHERE status = 'activo' ORDER BY rating DESC LIMIT 50`
    ),
    getPlanPrices(),
  ]);
  const teachersSummary = teachers.rows
    .map((t) => `- ID:${t.id} | ${t.name} (${t.kind}): ${t.specialty || ''} ${t.discipline || ''}, ${t.location || ''}, ${t.price || ''}, Rating:${t.rating || 0}/5`)
    .join('\n');

  const systemInstruction = `Sos el asistente virtual de Omia, la plataforma de yoga y pilates de Argentina.

PLANES PARA PROFESIONALES (por mes): Inicial ${formatARS(prices.inicial)}, Destacado ${formatARS(prices.destacado)}, Institucional ${formatARS(prices.institucional)}.

PROFESORES E INSTITUTOS ACTIVOS (${teachers.rows.length}):
${teachersSummary}

INSTRUCCIONES:
- Respondé siempre en español rioplatense, de forma amable y breve (máximo 3 o 4 párrafos).
- Recomendá fichas según lo que pida el usuario y enlazalas en markdown así: [Ver perfil](/profesor/ID).
- No inventes información que no esté arriba.`;

  const history = (Array.isArray(req.body.history) ? req.body.history : [])
    .filter((m: Row) => m?.role && (m.content || m.text))
    .slice(-10)
    .map((m: Row) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content || m.text).slice(0, 1500) }],
    }));

  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction },
  });
  const text = response.text || 'Lo siento, no pude procesar tu mensaje.';
  res.json({ text, reply: text });
}));

// ─── Static (production SPA) ──────────────────────────────────────────────────

if (IS_PROD) {
  const distPath = path.join(process.cwd(), 'dist');

  app.use(express.static(distPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get(/^(?!\/api\/).*$/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── 404 catch-all ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: Error & { code?: string }, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${req.method} ${req.path}]`, err.message);
  // 22P02: texto que no es un uuid/número válido; 23xxx: restricciones de la base.
  if (err.code === '22P02' || err.code?.startsWith('23')) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Tareas de arranque ───────────────────────────────────────────────────────

async function seedAdmin(): Promise<void> {
  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
  if (exists.rows.length > 0) return;
  // Sin contraseña definida no se crea ningún admin: nunca hay una clave por defecto.
  if (ADMIN_PASSWORD.length < 10) {
    console.warn('[seed] No existe un usuario admin y ADMIN_PASSWORD no está definida (mínimo 10 caracteres). No se creó ninguno.');
    return;
  }
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, 'Administrador', 'admin')`,
    [ADMIN_EMAIL.toLowerCase(), password_hash]
  );
  console.log(`[seed] Admin user created: ${ADMIN_EMAIL}`);
}

// Da de baja los planes vencidos. La ficha sigue publicada, pero pierde el destaque.
// Antes de vencer, se vuelve a consultar a Mercado Pago por si el aviso de un cobro se perdió.
async function expirePlans(): Promise<void> {
  try {
    if (mp) {
      const stale = await pool.query(
        `SELECT s.id FROM subscriptions s JOIN teachers t ON t.id = s.teacher_id
         WHERE s.status IN ('activa', 'pausada') AND s.mp_preapproval_id IS NOT NULL
           AND t.plan_active = true AND t.plan_expires_at < NOW() + INTERVAL '1 day'`
      );
      for (const row of stale.rows) {
        try { await syncSubscription(row.id); } catch (err) { console.error('[planes] No se pudo sincronizar', row.id, (err as Error).message); }
      }
    }
    const result = await pool.query(
      `UPDATE teachers SET plan_active = false
       WHERE plan_active = true AND plan_expires_at IS NOT NULL AND plan_expires_at < NOW()
       RETURNING id, user_id`
    );
    if (result.rows.length) {
      console.log(`[planes] ${result.rows.length} plan(es) vencido(s) dado(s) de baja`);
      for (const row of result.rows) {
        await pool.query(`UPDATE subscriptions SET status = 'vencida', updated_at = NOW() WHERE teacher_id = $1 AND status IN ('activa', 'pausada')`, [row.id]);
        const user = row.user_id ? (await pool.query('SELECT * FROM users WHERE id = $1', [row.user_id])).rows[0] : null;
        if (user) void mails.subscriptionExpired(user);
      }
    }
  } catch (err) {
    console.error('[planes] Error al revisar vencimientos:', (err as Error).message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🧘 Omia API — ${NODE_ENV}`);
  console.log(`   Listening on port ${PORT}`);
  console.log(`   APP_URL: ${APP_URL}`);
  console.log(`   Pagos: ${mp ? 'Mercado Pago' : SIMULATED_PAYMENTS ? 'simulador (solo desarrollo)' : 'DESHABILITADOS (falta MERCADOPAGO_ACCESS_TOKEN)'}\n`);

  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connection OK');
    await seedAdmin();
    await expirePlans();
    setInterval(expirePlans, 60 * 60 * 1000).unref();
  } catch (err) {
    console.error('[DB] Connection FAILED:', err);
  }
});

export default app;
