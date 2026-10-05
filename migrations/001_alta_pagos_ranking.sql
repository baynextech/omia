-- Omia — Migración 001: alta de profesor/instituto, pagos verificados, visitas y ranking
-- Se puede correr más de una vez sin romper nada.
-- Uso: psql "$DATABASE_URL" -f migrations/001_alta_pagos_ranking.sql

BEGIN;

-- ─── Users: se suma el rol instituto ────────────────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('alumno', 'profesor', 'instituto', 'admin'));

-- ─── Teachers: una ficha puede ser de un profesor o de un instituto ─────────
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'profesor';
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_kind_check;
ALTER TABLE teachers ADD CONSTRAINT teachers_kind_check CHECK (kind IN ('profesor', 'instituto'));

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS address   TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS hours     TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS website   TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS institute_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

-- Una sola ficha por cuenta
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_unique ON teachers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_kind      ON teachers(kind);
CREATE INDEX IF NOT EXISTS idx_teachers_institute ON teachers(institute_id);

-- ─── Visitas a fichas (para el panel del profesional y "vistos" del alumno) ──
CREATE TABLE IF NOT EXISTS teacher_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visitor_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visits_teacher ON teacher_visits(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user    ON teacher_visits(user_id, created_at DESC);

-- ─── Reseñas: respuesta del profesional y fecha de edición ──────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply      TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply_at   TIMESTAMPTZ;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ─── Transacciones: qué se compró y cuándo se actualizó ─────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS item_id    TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items      JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_transactions_mp_payment ON transactions(mp_payment_id);

-- ─── Productos: datos que muestra la tienda ─────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS discipline TEXT DEFAULT 'Yoga & Pilates';
ALTER TABLE products ADD COLUMN IF NOT EXISTS badge      TEXT;

COMMIT;
