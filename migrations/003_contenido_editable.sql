-- Omia — Migración 003: contenido del sitio editable desde el panel de administración.
-- Se puede correr más de una vez sin romper nada.

BEGIN;

-- Cada fila es un texto, lista o imagen del sitio. Si no hay fila, el sitio usa el texto original del código.
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Imágenes subidas desde el panel (portada, vista previa en redes, etc.).
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMIT;
