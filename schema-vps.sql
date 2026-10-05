-- Omia — Schema PostgreSQL nativo (sin Supabase)
-- Correr una sola vez al inicializar la DB

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users (reemplaza auth.users + profiles) ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'alumno' CHECK (role IN ('alumno', 'profesor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teachers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  discipline TEXT DEFAULT 'Yoga',
  location TEXT,
  bio TEXT,
  price TEXT DEFAULT '$8.000/clase',
  available_days TEXT[] DEFAULT '{}',
  email TEXT,
  phone TEXT,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3,1) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  plan TEXT DEFAULT 'ninguno' CHECK (plan IN ('ninguno', 'inicial', 'destacado', 'institucional')),
  plan_active BOOLEAN DEFAULT FALSE,
  plan_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'activo' CHECK (status IN ('pendiente', 'activo', 'inactivo')),
  impressions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Products ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  images TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  stock INT DEFAULT 999,
  active BOOLEAN DEFAULT TRUE,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bookings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  teacher_name TEXT,
  date DATE,
  time TEXT,
  price DECIMAL(12,2),
  status TEXT DEFAULT 'confirmada',
  payment_status TEXT DEFAULT 'pendiente',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name TEXT,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, teacher_id)
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  type TEXT CHECK (type IN ('booking', 'subscription', 'product')),
  amount DECIMAL(12,2),
  description TEXT,
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Favorites ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, teacher_id)
);

-- ─── Admin Config ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_teachers_status       ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_location     ON teachers(location);
CREATE INDEX IF NOT EXISTS idx_teachers_discipline   ON teachers(discipline);
CREATE INDEX IF NOT EXISTS idx_teachers_plan_active  ON teachers(plan_active);
CREATE INDEX IF NOT EXISTS idx_bookings_student      ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher      ON bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reviews_teacher       ON reviews(teacher_id);
CREATE INDEX IF NOT EXISTS idx_favorites_student     ON favorites(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);

-- ─── Seed admin_config ───────────────────────────────────────────────────────
INSERT INTO admin_config (key, value, label) VALUES
  ('plan_inicial_price',       '39900', 'Precio Plan Inicial (ARS)'),
  ('plan_destacado_price',     '43900', 'Precio Plan Destacado (ARS)'),
  ('plan_institucional_price', '49900', 'Precio Plan Institucional (ARS)')
ON CONFLICT (key) DO NOTHING;

-- Después de este archivo hay que aplicar las migraciones en orden:
--   npm run db:migrate   (o psql "$DATABASE_URL" -f migrations/001_alta_pagos_ranking.sql)
