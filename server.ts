import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { MercadoPagoConfig, Preference } from 'mercadopago';

dotenv.config();

// ─── Constants ──────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '4000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'omia_jwt_secret_fallback_change_in_prod';
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_URL = process.env.APP_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@omia.site';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATABASE_URL = process.env.DATABASE_URL || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

// ─── DB Pool ─────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Types ───────────────────────────────────────────────────────────────────

interface JwtPayload {
  userId: string;
}

interface AuthRequest extends Request {
  user?: { id: string };
  profile?: Record<string, unknown>;
}

// ─── Auth Middlewares ─────────────────────────────────────────────────────────

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token requerido' });
      return;
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }
    const user = result.rows[0];
    req.user = { id: user.id };
    req.profile = user;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if ((req.profile as { role?: string })?.role !== 'admin') {
      res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
      return;
    }
    next();
  });
}

async function requireTeacher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const role = (req.profile as { role?: string })?.role;
    if (role !== 'profesor' && role !== 'admin') {
      res.status(403).json({ error: 'Acceso denegado: se requiere rol profesor' });
      return;
    }
    next();
  });
}

// ─── Helper: sign JWT ─────────────────────────────────────────────────────────

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// ─── Helper: safe user payload ────────────────────────────────────────────────

function safeUser(row: Record<string, unknown>) {
  const { password_hash: _, ...safe } = row;
  return safe;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: NODE_ENV });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password y name son requeridos' });
      return;
    }

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      res.status(409).json({ error: 'El email ya está registrado' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'alumno', NOW())
       RETURNING *`,
      [email.toLowerCase(), password_hash, name]
    );

    const user = result.rows[0];
    const token = signToken(user.id);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email y password son requeridos' });
      return;
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = signToken(user.id);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: safeUser(req.profile as Record<string, unknown>) });
});

// ─── Teachers (public) ───────────────────────────────────────────────────────

app.get('/api/teachers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, discipline, specialty, priceRange, availability } = req.query;

    const conditions: string[] = ["status = 'activo'"];
    const params: unknown[] = [];
    let idx = 1;

    if (location) {
      conditions.push(`LOWER(location) LIKE $${idx++}`);
      params.push(`%${String(location).toLowerCase()}%`);
    }
    if (discipline) {
      conditions.push(`LOWER(discipline) LIKE $${idx++}`);
      params.push(`%${String(discipline).toLowerCase()}%`);
    }
    if (specialty) {
      conditions.push(`LOWER(specialty) LIKE $${idx++}`);
      params.push(`%${String(specialty).toLowerCase()}%`);
    }
    if (priceRange) {
      const [min, max] = String(priceRange).split('-').map(Number);
      if (!isNaN(min)) {
        conditions.push(`CAST(price AS numeric) >= $${idx++}`);
        params.push(min);
      }
      if (!isNaN(max)) {
        conditions.push(`CAST(price AS numeric) <= $${idx++}`);
        params.push(max);
      }
    }
    if (availability) {
      conditions.push(`$${idx++} = ANY(available_days)`);
      params.push(String(availability));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM teachers ${where} ORDER BY plan = 'destacado' DESC, rating DESC, created_at DESC`;
    const result = await pool.query(sql, params);
    res.json({ teachers: result.rows });
  } catch (err) {
    console.error('[GET /api/teachers]', err);
    res.status(500).json({ error: 'Error al obtener profesores' });
  }
});

app.get('/api/teachers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profesor no encontrado' });
      return;
    }
    res.json({ teacher: result.rows[0] });
  } catch (err) {
    console.error('[GET /api/teachers/:id]', err);
    res.status(500).json({ error: 'Error al obtener profesor' });
  }
});

app.post('/api/teachers/:id/visit', async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      'UPDATE teachers SET impressions = COALESCE(impressions, 0) + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/teachers/:id/visit]', err);
    res.status(500).json({ error: 'Error al registrar visita' });
  }
});

app.get('/api/teachers/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE teacher_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('[GET /api/teachers/:id/reviews]', err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

app.post('/api/teachers/:id/reviews', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const teacherId = req.params.id;
    const studentId = req.user!.id;
    const studentName = (req.profile as { name?: string })?.name || 'Anónimo';

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'rating debe ser entre 1 y 5' });
      return;
    }

    // Insert review (unique constraint on student_id + teacher_id)
    const reviewResult = await pool.query(
      `INSERT INTO reviews (id, student_id, student_name, teacher_id, rating, comment, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (student_id, teacher_id) DO UPDATE
         SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING *`,
      [studentId, studentName, teacherId, parseInt(rating), comment || '']
    );

    // Recalculate avg rating
    const avgResult = await pool.query(
      'SELECT AVG(rating)::numeric(3,2) AS avg, COUNT(*) AS cnt FROM reviews WHERE teacher_id = $1',
      [teacherId]
    );
    const { avg, cnt } = avgResult.rows[0];
    await pool.query(
      'UPDATE teachers SET rating = $1, review_count = $2 WHERE id = $3',
      [parseFloat(avg) || 0, parseInt(cnt) || 0, teacherId]
    );

    res.status(201).json({ review: reviewResult.rows[0] });
  } catch (err) {
    console.error('[POST /api/teachers/:id/reviews]', err);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

// ─── Products (public) ───────────────────────────────────────────────────────

app.get('/api/products', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE active = true ORDER BY created_at DESC'
    );
    res.json({ products: result.rows });
  } catch (err) {
    console.error('[GET /api/products]', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// ─── User Profile ─────────────────────────────────────────────────────────────

app.get('/api/user/profile', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ profile: safeUser(req.profile as Record<string, unknown>) });
});

app.post('/api/user/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, avatar_url, bio } = req.body;
    const userId = req.user!.id;

    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         avatar_url = COALESCE($2, avatar_url),
         bio = COALESCE($3, bio)
       WHERE id = $4 RETURNING *`,
      [name || null, avatar_url || null, bio || null, userId]
    );

    res.json({ profile: safeUser(result.rows[0]) });
  } catch (err) {
    console.error('[POST /api/user/profile]', err);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ─── User Bookings ────────────────────────────────────────────────────────────

app.get('/api/user/bookings', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookings WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error('[GET /api/user/bookings]', err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// ─── Favorites ────────────────────────────────────────────────────────────────

app.get('/api/user/favorites', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT f.*, t.name AS teacher_name, t.specialty, t.location, t.images, t.rating, t.plan
       FROM favorites f
       JOIN teachers t ON t.id = f.teacher_id
       WHERE f.student_id = $1
       ORDER BY f.created_at DESC`,
      [req.user!.id]
    );
    res.json({ favorites: result.rows });
  } catch (err) {
    console.error('[GET /api/user/favorites]', err);
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

app.post('/api/favorites/:teacherId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `INSERT INTO favorites (id, student_id, teacher_id, created_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (student_id, teacher_id) DO NOTHING
       RETURNING *`,
      [req.user!.id, req.params.teacherId]
    );
    res.status(201).json({ favorite: result.rows[0] || null });
  } catch (err) {
    console.error('[POST /api/favorites/:teacherId]', err);
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

app.delete('/api/favorites/:teacherId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE student_id = $1 AND teacher_id = $2',
      [req.user!.id, req.params.teacherId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/favorites/:teacherId]', err);
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

// ─── User Reviews ─────────────────────────────────────────────────────────────

app.get('/api/user/reviews', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT r.*, t.name AS teacher_name
       FROM reviews r
       JOIN teachers t ON t.id = r.teacher_id
       WHERE r.student_id = $1
       ORDER BY r.created_at DESC`,
      [req.user!.id]
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('[GET /api/user/reviews]', err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// ─── Teacher Profile (teacher panel) ─────────────────────────────────────────

app.get('/api/teacher/profile', requireTeacher, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM teachers WHERE user_id = $1',
      [req.user!.id]
    );
    res.json({ teacher: result.rows[0] || null });
  } catch (err) {
    console.error('[GET /api/teacher/profile]', err);
    res.status(500).json({ error: 'Error al obtener perfil de profesor' });
  }
});

app.post('/api/teachers/create-or-update', requireTeacher, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      name, specialty, discipline, location, bio, price,
      available_days, email, phone, images,
    } = req.body;

    const existing = await pool.query('SELECT id FROM teachers WHERE user_id = $1', [userId]);

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE teachers SET
           name = COALESCE($1, name),
           specialty = COALESCE($2, specialty),
           discipline = COALESCE($3, discipline),
           location = COALESCE($4, location),
           bio = COALESCE($5, bio),
           price = COALESCE($6, price),
           available_days = COALESCE($7, available_days),
           email = COALESCE($8, email),
           phone = COALESCE($9, phone),
           images = COALESCE($10, images)
         WHERE user_id = $11 RETURNING *`,
        [name, specialty, discipline, location, bio, price, available_days, email, phone, images, userId]
      );
    } else {
      result = await pool.query(
        `INSERT INTO teachers
           (id, user_id, name, specialty, discipline, location, bio, price,
            available_days, email, phone, images, rating, review_count,
            plan, plan_active, status, impressions, created_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, 0, 0,
            'basico', false, 'activo', 0, NOW())
         RETURNING *`,
        [userId, name, specialty, discipline, location, bio, price, available_days, email, phone, images]
      );
    }

    res.json({ teacher: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/teachers/create-or-update]', err);
    res.status(500).json({ error: 'Error al guardar perfil de profesor' });
  }
});

app.get('/api/user/teacher-stats', requireTeacher, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE user_id = $1',
      [req.user!.id]
    );
    if (teacherResult.rows.length === 0) {
      res.json({ stats: null });
      return;
    }
    const teacher = teacherResult.rows[0];

    const [bookingsResult, reviewsResult] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) AS total, SUM(price) AS revenue FROM bookings WHERE teacher_id = $1',
        [teacher.id]
      ),
      pool.query(
        'SELECT COUNT(*) AS total FROM reviews WHERE teacher_id = $1',
        [teacher.id]
      ),
    ]);

    res.json({
      stats: {
        impressions: teacher.impressions || 0,
        rating: teacher.rating || 0,
        review_count: teacher.review_count || 0,
        bookings_total: parseInt(bookingsResult.rows[0].total) || 0,
        bookings_revenue: parseFloat(bookingsResult.rows[0].revenue) || 0,
        reviews_total: parseInt(reviewsResult.rows[0].total) || 0,
        plan: teacher.plan,
        plan_active: teacher.plan_active,
        plan_expires_at: teacher.plan_expires_at,
      },
    });
  } catch (err) {
    console.error('[GET /api/user/teacher-stats]', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

app.post('/api/bookings', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teacher_id, teacher_name, date, time, price } = req.body;
    if (!teacher_id || !date || !time) {
      res.status(400).json({ error: 'teacher_id, date y time son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO bookings
         (id, student_id, teacher_id, teacher_name, date, time, price,
          status, payment_status, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6,
          'pendiente', 'pendiente', NOW())
       RETURNING *`,
      [req.user!.id, teacher_id, teacher_name || '', date, time, price || 0]
    );

    res.status(201).json({ booking: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/bookings]', err);
    res.status(500).json({ error: 'Error al crear reserva' });
  }
});

// ─── Payments ─────────────────────────────────────────────────────────────────

app.post('/api/payments/mercadopago', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, itemId, title, price, quantity = 1 } = req.body;
    if (!type || !title || !price) {
      res.status(400).json({ error: 'type, title y price son requeridos' });
      return;
    }

    const successUrl = `${APP_URL}/perfil?payment=success&type=${type}&itemId=${itemId || ''}`;
    const pendingUrl = `${APP_URL}/perfil?payment=pending&type=${type}&itemId=${itemId || ''}`;
    const failureUrl = `${APP_URL}/perfil?payment=failure&type=${type}&itemId=${itemId || ''}`;

    if (!mp) {
      // Fallback to checkout simulator
      res.json({
        init_point: `${APP_URL}/checkout-simulator?type=${type}&itemId=${itemId || ''}&price=${price}`,
        sandbox_init_point: `${APP_URL}/checkout-simulator?type=${type}&itemId=${itemId || ''}&price=${price}`,
        fallback: true,
      });
      return;
    }

    try {
      const preference = new Preference(mp);
      const response = await preference.create({
        body: {
          items: [
            {
              id: itemId || type,
              title: String(title),
              quantity: Number(quantity),
              unit_price: Number(price),
              currency_id: 'ARS',
            },
          ],
          back_urls: {
            success: successUrl,
            pending: pendingUrl,
            failure: failureUrl,
          },
          auto_return: 'approved',
          metadata: {
            user_id: req.user!.id,
            type,
            itemId,
          },
        },
      });

      res.json({
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        id: response.id,
      });
    } catch (mpErr) {
      console.error('[MP preference create error]', mpErr);
      res.json({
        init_point: `${APP_URL}/checkout-simulator?type=${type}&itemId=${itemId || ''}&price=${price}`,
        sandbox_init_point: `${APP_URL}/checkout-simulator?type=${type}&itemId=${itemId || ''}&price=${price}`,
        fallback: true,
      });
    }
  } catch (err) {
    console.error('[POST /api/payments/mercadopago]', err);
    res.status(500).json({ error: 'Error al crear preferencia de pago' });
  }
});

app.post('/api/payments/confirm', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, itemId, mp_payment_id, mp_preference_id, amount, description } = req.body;
    const userId = req.user!.id;
    const userName = (req.profile as { name?: string })?.name || '';

    if (type === 'subscription') {
      const planName = itemId || 'basico';
      const planExpires = new Date();
      planExpires.setDate(planExpires.getDate() + 30);

      await pool.query(
        `UPDATE teachers
         SET plan = $1, plan_active = true, plan_expires_at = $2
         WHERE user_id = $3`,
        [planName, planExpires.toISOString(), userId]
      );

      await pool.query(
        `UPDATE users SET role = 'profesor' WHERE id = $1`,
        [userId]
      );
    } else if (type === 'booking' && mp_payment_id) {
      await pool.query(
        `UPDATE bookings
         SET payment_status = 'aprobado', mp_payment_id = $1
         WHERE mp_preference_id = $2`,
        [mp_payment_id, mp_preference_id]
      );
    }

    // Record transaction
    await pool.query(
      `INSERT INTO transactions
         (id, user_id, user_name, type, amount, description,
          mp_preference_id, mp_payment_id, status, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'aprobado', NOW())`,
      [userId, userName, type, amount || 0, description || '', mp_preference_id || '', mp_payment_id || '']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/payments/confirm]', err);
    res.status(500).json({ error: 'Error al confirmar pago' });
  }
});

// ─── Admin: Dashboard ─────────────────────────────────────────────────────────

app.get('/api/admin/dashboard', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [users, teachers, products, bookings, transactions, reviews] = await Promise.all([
      pool.query('SELECT COUNT(*) AS cnt FROM users'),
      pool.query('SELECT COUNT(*) AS cnt FROM teachers'),
      pool.query('SELECT COUNT(*) AS cnt FROM products WHERE active = true'),
      pool.query('SELECT COUNT(*) AS cnt FROM bookings'),
      pool.query(`SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM transactions WHERE status = 'aprobado'`),
      pool.query('SELECT COUNT(*) AS cnt FROM reviews'),
    ]);

    res.json({
      users: parseInt(users.rows[0].cnt),
      teachers: parseInt(teachers.rows[0].cnt),
      products: parseInt(products.rows[0].cnt),
      bookings: parseInt(bookings.rows[0].cnt),
      transactions: parseInt(transactions.rows[0].cnt),
      revenue: parseFloat(transactions.rows[0].total),
      reviews: parseInt(reviews.rows[0].cnt),
    });
  } catch (err) {
    console.error('[GET /api/admin/dashboard]', err);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// ─── Admin: Config ────────────────────────────────────────────────────────────

app.get('/api/admin/config', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM admin_config ORDER BY key');
    res.json({ config: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    res.status(500).json({ error: 'Error al obtener config' });
  }
});

app.put('/api/admin/config', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value, label } = req.body;
    if (!key) {
      res.status(400).json({ error: 'key es requerido' });
      return;
    }

    await pool.query(
      `INSERT INTO admin_config (key, value, label, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, label = COALESCE($3, admin_config.label), updated_at = NOW()`,
      [key, value, label || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/admin/config]', err);
    res.status(500).json({ error: 'Error al actualizar config' });
  }
});

// ─── Admin: Users ─────────────────────────────────────────────────────────────

app.get('/api/admin/users', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, bio, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.put('/api/admin/users/:id/role', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    const validRoles = ['alumno', 'profesor', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `role debe ser uno de: ${validRoles.join(', ')}` });
      return;
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[PUT /api/admin/users/:id/role]', err);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// ─── Admin: Teachers ──────────────────────────────────────────────────────────

app.get('/api/admin/teachers', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM teachers ORDER BY created_at DESC');
    res.json({ teachers: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/teachers]', err);
    res.status(500).json({ error: 'Error al obtener profesores' });
  }
});

app.post('/api/admin/teachers', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id, name, specialty, discipline, location, bio, price,
      available_days, email, phone, images, plan, plan_active, status,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO teachers
         (id, user_id, name, specialty, discipline, location, bio, price,
          available_days, email, phone, images, rating, review_count,
          plan, plan_active, status, impressions, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, 0, 0,
          $12, $13, $14, 0, NOW())
       RETURNING *`,
      [
        user_id || null, name, specialty, discipline, location, bio, price,
        available_days || [], email, phone, images || [],
        plan || 'basico', plan_active ?? false, status || 'activo',
      ]
    );
    res.status(201).json({ teacher: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/admin/teachers]', err);
    res.status(500).json({ error: 'Error al crear profesor' });
  }
});

app.put('/api/admin/teachers/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const fields: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    const allowed = [
      'name', 'specialty', 'discipline', 'location', 'bio', 'price',
      'available_days', 'email', 'phone', 'images', 'plan',
      'plan_active', 'plan_expires_at', 'status', 'impressions',
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        vals.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE teachers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profesor no encontrado' });
      return;
    }
    res.json({ teacher: result.rows[0] });
  } catch (err) {
    console.error('[PUT /api/admin/teachers/:id]', err);
    res.status(500).json({ error: 'Error al actualizar profesor' });
  }
});

app.delete('/api/admin/teachers/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM teachers WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profesor no encontrado' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/teachers/:id]', err);
    res.status(500).json({ error: 'Error al eliminar profesor' });
  }
});

// ─── Admin: Products ──────────────────────────────────────────────────────────

app.get('/api/admin/products', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ products: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/products]', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/api/admin/products', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, images, category, stock, features } = req.body;
    if (!name || price === undefined) {
      res.status(400).json({ error: 'name y price son requeridos' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO products
         (id, name, description, price, images, category, stock, active, features, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NOW())
       RETURNING *`,
      [name, description || '', price, images || [], category || '', stock || 0, features || []]
    );
    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    console.error('[POST /api/admin/products]', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const fields: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    const allowed = ['name', 'description', 'price', 'images', 'category', 'stock', 'active', 'features'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        vals.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error('[PUT /api/admin/products/:id]', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Soft delete: mark inactive
    const result = await pool.query(
      'UPDATE products SET active = false WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/products/:id]', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ─── Admin: Transactions ──────────────────────────────────────────────────────

app.get('/api/admin/transactions', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json({ transactions: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/transactions]', err);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// ─── Admin: Bookings ──────────────────────────────────────────────────────────

app.get('/api/admin/bookings', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT b.*, u.name AS student_name, u.email AS student_email
       FROM bookings b
       LEFT JOIN users u ON u.id = b.student_id
       ORDER BY b.created_at DESC`
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/bookings]', err);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

app.put('/api/admin/bookings/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const fields: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    const allowed = ['status', 'payment_status', 'date', 'time', 'price', 'mp_preference_id', 'mp_payment_id'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        vals.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error('[PUT /api/admin/bookings/:id]', err);
    res.status(500).json({ error: 'Error al actualizar reserva' });
  }
});

app.delete('/api/admin/bookings/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM bookings WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/bookings/:id]', err);
    res.status(500).json({ error: 'Error al eliminar reserva' });
  }
});

// ─── Admin: Reviews ───────────────────────────────────────────────────────────

app.get('/api/admin/reviews', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT r.*, t.name AS teacher_name
       FROM reviews r
       LEFT JOIN teachers t ON t.id = r.teacher_id
       ORDER BY r.created_at DESC`
    );
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error('[GET /api/admin/reviews]', err);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewResult = await pool.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING teacher_id',
      [req.params.id]
    );
    if (reviewResult.rows.length === 0) {
      res.status(404).json({ error: 'Reseña no encontrada' });
      return;
    }

    // Recalculate avg rating for the teacher
    const teacherId = reviewResult.rows[0].teacher_id;
    const avgResult = await pool.query(
      'SELECT AVG(rating)::numeric(3,2) AS avg, COUNT(*) AS cnt FROM reviews WHERE teacher_id = $1',
      [teacherId]
    );
    const { avg, cnt } = avgResult.rows[0];
    await pool.query(
      'UPDATE teachers SET rating = $1, review_count = $2 WHERE id = $3',
      [parseFloat(avg) || 0, parseInt(cnt) || 0, teacherId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/reviews/:id]', err);
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
});

// ─── AI: Smart Search ─────────────────────────────────────────────────────────

app.post('/api/smart-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'query es requerido' });
      return;
    }

    if (!genai) {
      res.status(503).json({ error: 'Servicio de IA no disponible' });
      return;
    }

    const teachersResult = await pool.query(
      `SELECT id, name, specialty, discipline, location, bio, price, available_days,
              rating, review_count, plan, status
       FROM teachers WHERE status = 'activo' ORDER BY rating DESC`
    );
    const teachers = teachersResult.rows;

    const teachersSummary = teachers
      .map(
        (t) =>
          `ID:${t.id} | ${t.name} | ${t.specialty || ''} | ${t.discipline || ''} | ${t.location || ''} | Rating:${t.rating} | Precio:${t.price}`
      )
      .join('\n');

    const prompt = `Sos un buscador inteligente de profesores de yoga y pilates en Argentina.

Profesores disponibles:
${teachersSummary}

Consulta del usuario: "${query}"

Respondé SOLO con un array JSON de IDs de profesores relevantes, ordenados por relevancia, sin explicaciones adicionales.
Ejemplo: ["uuid1", "uuid2", "uuid3"]
Si ninguno coincide, respondé: []`;

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text || '[]';
    const match = text.match(/\[[\s\S]*\]/);
    const ids: string[] = match ? JSON.parse(match[0]) : [];

    // Return teachers in the order returned by AI
    const orderedTeachers = ids
      .map((id) => teachers.find((t) => t.id === id))
      .filter(Boolean);

    res.json({ teachers: orderedTeachers, query });
  } catch (err) {
    console.error('[POST /api/smart-search]', err);
    res.status(500).json({ error: 'Error en búsqueda inteligente' });
  }
});

// ─── AI: Chat ─────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message es requerido' });
      return;
    }

    if (!genai) {
      res.status(503).json({ error: 'Servicio de IA no disponible' });
      return;
    }

    const [teachersResult, configResult] = await Promise.all([
      pool.query(
        `SELECT name, specialty, discipline, location, bio, price, available_days, rating, phone, email
         FROM teachers WHERE status = 'activo' ORDER BY rating DESC LIMIT 50`
      ),
      pool.query('SELECT key, value, label FROM admin_config'),
    ]);

    const teachers = teachersResult.rows;
    const config = configResult.rows;

    const configSummary = config
      .map((c) => `${c.label || c.key}: ${c.value}`)
      .join('\n');

    const teachersSummary = teachers
      .map(
        (t) =>
          `- ${t.name}: ${t.specialty || ''} ${t.discipline || ''}, ${t.location || ''}, $${t.price || ''}, Rating:${t.rating || 0}/5${t.phone ? `, Tel:${t.phone}` : ''}`
      )
      .join('\n');

    const systemPrompt = `Sos el asistente virtual de Omia, el directorio de yoga y pilates más completo de Argentina.

INFORMACIÓN DEL SITIO:
${configSummary}

PROFESORES ACTIVOS (${teachers.length}):
${teachersSummary}

INSTRUCCIONES:
- Respondé siempre en español, de forma amable y profesional
- Ayudá al usuario a encontrar profesores según sus necesidades
- Podés recomendar profesores específicos con sus datos de contacto
- Si el usuario pregunta por precios, ubicaciones o disponibilidad, usá los datos de arriba
- No inventes información que no tenés
- Mantené respuestas concisas (máximo 3-4 párrafos)`;

    // Build conversation history for the API
    const contents: { role: string; parts: { text: string }[] }[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.content) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + message }] },
        ...contents.slice(0, -1),
        contents[contents.length - 1],
      ],
    });

    const reply = response.text || 'Lo siento, no pude procesar tu mensaje.';
    res.json({ reply, message });
  } catch (err) {
    console.error('[POST /api/chat]', err);
    res.status(500).json({ error: 'Error en el chat' });
  }
});

// ─── Static (production SPA) ──────────────────────────────────────────────────

if (NODE_ENV === 'production') {
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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Seed admin user on startup ───────────────────────────────────────────────

async function seedAdmin(): Promise<void> {
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
    if (exists.rows.length === 0) {
      const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'Administrador', 'admin', NOW())`,
        [ADMIN_EMAIL.toLowerCase(), password_hash]
      );
      console.log(`[seed] Admin user created: ${ADMIN_EMAIL}`);
    } else {
      console.log(`[seed] Admin user already exists: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('[seed] Error creating admin user:', err);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`\n🧘 Omia API — ${NODE_ENV}`);
  console.log(`   Listening on port ${PORT}`);
  console.log(`   APP_URL: ${APP_URL}\n`);

  // Test DB connection
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connection OK');
    await seedAdmin();
  } catch (err) {
    console.error('[DB] Connection FAILED:', err);
  }
});

export default app;
