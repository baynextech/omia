-- Omia — Migración 002: cobro mensual recurrente, login con Google, recuperación de contraseña,
-- noticias y consultas de contacto.
-- Se puede correr más de una vez sin romper nada.
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/002_suscripciones_google_noticias.sql

BEGIN;

-- ─── Users: login con Google y verificación de email ────────────────────────
-- Quien entra con Google no tiene contraseña propia (se guarda un hash inutilizable).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_id) WHERE google_id IS NOT NULL;

-- ─── Recuperación de contraseña ─────────────────────────────────────────────
-- Se guarda solo el hash del token: si alguien lee la base no puede usarlo.
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- ─── Suscripciones mensuales (Mercado Pago PreApproval) ─────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  plan TEXT NOT NULL CHECK (plan IN ('inicial', 'destacado', 'institucional')),
  amount NUMERIC(12,2) NOT NULL,
  -- pendiente: creada, falta autorizar en Mercado Pago · activa: autorizada y cobrando
  -- pausada: Mercado Pago frenó los cobros · cancelada: dada de baja · vencida: sin cobro tras la gracia
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'activa', 'pausada', 'cancelada', 'vencida')),
  mp_preapproval_id TEXT UNIQUE,
  next_payment_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Los cobros de cada mes quedan en transactions, con su pago de Mercado Pago como clave única
-- para que un aviso repetido no sume dos veces.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_mp_payment_unique
  ON transactions(mp_payment_id) WHERE mp_payment_id IS NOT NULL AND type = 'subscription' AND subscription_id IS NOT NULL;

-- ─── Avisos ya procesados (evita repetir mails y cobros por reintentos del webhook) ─
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  topic TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Noticias del sector ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  image TEXT,
  category TEXT DEFAULT 'General',
  author TEXT DEFAULT 'Equipo Omia',
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'publicado')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(status, published_at DESC);

-- ─── Mensajes de contacto y bajas ───────────────────────────────────────────
-- kind: consulta · arrepentimiento (botón de arrepentimiento de la tienda) · baja (baja de cuenta o abono)
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'consulta' CHECK (kind IN ('consulta', 'arrepentimiento', 'baja')),
  name TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  reference TEXT,
  handled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pedidos de la tienda: datos de envío ───────────────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shipping JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fulfillment TEXT NOT NULL DEFAULT 'pendiente';
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_fulfillment_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_fulfillment_check
  CHECK (fulfillment IN ('pendiente', 'preparando', 'despachado', 'entregado', 'cancelado'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tracking TEXT;

COMMIT;
