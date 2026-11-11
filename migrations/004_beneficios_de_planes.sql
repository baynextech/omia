-- Beneficios de los planes: URL propia (slug), ubicación en el mapa, grilla de horarios del instituto.
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS slug     TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS lat      DOUBLE PRECISION;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS lng      DOUBLE PRECISION;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS schedule TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS teachers_slug_key ON teachers (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS teachers_institute_idx ON teachers (institute_id) WHERE institute_id IS NOT NULL;
