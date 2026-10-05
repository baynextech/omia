import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { Pool, PoolClient, types } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

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
  ssl: IS_PROD ? { rejectUnauthorized: false } : false,
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

  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length > 0) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, password_hash, name, role]
  );
  res.status(201).json(await sessionPayload(result.rows[0]));
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
    paymentStatus: b.payment_status === 'aprobado' ? 'Pagado' : 'Pendiente',
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
  const empty = { impressions: 0, visitors: [], bookings: 0, earned: 0, pendingPayout: 0, rating: 0, reviews: 0 };
  const teacher = await getTeacherByUser(req.user!.id);
  if (!teacher) return res.json(empty);

  const [bookings, visitors] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(price) FILTER (WHERE payment_status = 'aprobado'), 0) AS earned,
              COALESCE(SUM(price) FILTER (WHERE payment_status <> 'aprobado' AND status <> 'cancelada'), 0) AS pending
       FROM bookings WHERE teacher_id = $1`,
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
    earned: Number(bookings.rows[0].earned) || 0,
    pendingPayout: Number(bookings.rows[0].pending) || 0,
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

  // El precio sale de la ficha del profesor, nunca de lo que manda el navegador.
  const result = await pool.query(
    `INSERT INTO bookings (student_id, teacher_id, teacher_name, date, time, price, status, payment_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'confirmada', 'pendiente') RETURNING *`,
    [req.user!.id, teacherId, teacher.name, date, time, priceToNumber(teacher.price)]
  );
  res.status(201).json({ success: true, booking: bookingDTO(result.rows[0]) });
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

    if (tx.type === 'subscription') {
      // Suma 30 días desde el vencimiento vigente (o desde hoy) y publica la ficha si estaba pendiente.
      await client.query(
        `UPDATE teachers SET
           plan = $1, plan_active = true,
           plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + ($2 || ' days')::interval,
           status = CASE WHEN status = 'pendiente' THEN 'activo' ELSE status END
         WHERE user_id = $3`,
        [tx.item_id, String(PLAN_DAYS), tx.user_id]
      );
    } else if (tx.type === 'booking') {
      await client.query(
        `UPDATE bookings SET payment_status = 'aprobado', mp_payment_id = $1 WHERE id = $2`,
        [mpPaymentId, tx.item_id]
      );
    } else if (tx.type === 'product') {
      for (const item of (tx.items || []) as { id: string; quantity: number }[]) {
        await client.query('UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2', [item.quantity, item.id]);
      }
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
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
  const itemId = String(req.body.itemId || '');

  // El monto y el título se calculan siempre acá; lo que mande el navegador se ignora.
  let amount = 0;
  let title = '';
  let itemRef: string | null = null;
  let orderItems: { id: string; name: string; quantity: number; unit_price: number }[] | null = null;

  if (type === 'subscription') {
    if (!PLANS[itemId]) return res.status(400).json({ error: 'Plan inexistente' });
    if (!(await getTeacherByUser(userId))) {
      return res.status(409).json({ error: 'Primero completá y guardá tu perfil público. Después podés activar el plan.' });
    }
    amount = (await getPlanPrices())[itemId] || 0;
    title = `Membresía Omia - ${PLANS[itemId]} (${PLAN_DAYS} días)`;
    itemRef = itemId;
  } else if (type === 'booking') {
    if (!isUuid(itemId)) return res.status(404).json({ error: 'Reserva no encontrada' });
    const booking = (await pool.query('SELECT * FROM bookings WHERE id = $1 AND student_id = $2', [itemId, userId])).rows[0];
    if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (booking.payment_status === 'aprobado') return res.status(409).json({ error: 'Esta reserva ya está paga' });
    amount = Number(booking.price) || 0;
    title = `Clase con ${booking.teacher_name} - ${booking.date} ${booking.time}`;
    itemRef = booking.id;
  } else if (type === 'product') {
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
    amount = orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    title = `Compra Omia Shop (${orderItems.length} ${orderItems.length === 1 ? 'producto' : 'productos'})`;
  } else {
    return res.status(400).json({ error: 'Tipo de pago inválido' });
  }

  if (!(amount > 0)) return res.status(400).json({ error: 'No se pudo calcular el importe' });
  if (!mp && !SIMULATED_PAYMENTS) {
    return res.status(503).json({ error: 'Los pagos no están disponibles en este momento. Probá más tarde.' });
  }

  const tx = (await pool.query(
    `INSERT INTO transactions (user_id, user_name, type, amount, description, item_id, items, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente') RETURNING id`,
    [userId, req.profile!.name || '', type, amount, title, itemRef, orderItems ? JSON.stringify(orderItems) : null]
  )).rows[0];

  const backUrl = (status: string) =>
    `${APP_URL}/perfil?payment=${status}&type=${type}&itemId=${encodeURIComponent(itemRef || '')}&tx=${tx.id}`;

  if (!mp) {
    const params = new URLSearchParams({ type, itemId: itemRef || '', title, price: String(amount), tx: tx.id });
    return res.json({ success: true, checkoutUrl: `${APP_URL}/checkout-simulator?${params}`, transactionId: tx.id, isMock: true });
  }

  try {
    const mpItems = orderItems
      ? orderItems.map((i) => ({ id: i.id, title: i.name, quantity: i.quantity, unit_price: i.unit_price, currency_id: 'ARS' }))
      : [{ id: itemRef || type, title, quantity: 1, unit_price: amount, currency_id: 'ARS' }];

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
  const topic = req.body?.type || req.query.type || req.query.topic;
  const dataId = String(req.body?.data?.id || req.query['data.id'] || req.query.id || '');
  if (topic !== 'payment' || !/^\d+$/.test(dataId)) return res.sendStatus(200);
  if (!validWebhookSignature(req, dataId)) return res.sendStatus(401);

  try {
    const result = await verifyMercadoPagoPayment(dataId);
    console.log(`[MP webhook] pago ${dataId}: ${result.status}`);
  } catch (err) {
    console.error('[MP webhook]', err);
    return res.sendStatus(500); // Mercado Pago reintenta
  }
  res.sendStatus(200);
}));

// ─── Admin ────────────────────────────────────────────────────────────────────

app.get('/api/admin/dashboard', requireAdmin, h(async (_req, res) => {
  const [users, teachers, bookings, revenue, recentUsers] = await Promise.all([
    pool.query('SELECT COUNT(*) AS n FROM users'),
    pool.query(`SELECT COUNT(*) AS n FROM teachers WHERE status = 'activo'`),
    pool.query('SELECT COUNT(*) AS n FROM bookings'),
    pool.query(`SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'aprobado' GROUP BY type`),
    pool.query('SELECT name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
  ]);
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
async function expirePlans(): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE teachers SET plan_active = false
       WHERE plan_active = true AND plan_expires_at IS NOT NULL AND plan_expires_at < NOW()
       RETURNING id`
    );
    if (result.rows.length) console.log(`[planes] ${result.rows.length} plan(es) vencido(s) dado(s) de baja`);
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
