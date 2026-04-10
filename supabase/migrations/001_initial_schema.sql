-- ═══════════════════════════════════════════════════════════════
-- Limpieza RR — Schema Inicial Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── PRODUCTOS ──────────────────────────────────────────────
-- Tabla ya existe, aseguramos estructura completa
CREATE TABLE IF NOT EXISTS productos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  tamano       TEXT DEFAULT '',
  precio       NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo        NUMERIC(12,2) NOT NULL DEFAULT 0,
  categoria    TEXT DEFAULT '',
  destacado    BOOLEAN DEFAULT FALSE,
  emoji        TEXT DEFAULT '',
  descripcion  TEXT DEFAULT '',
  imagen       TEXT DEFAULT '',
  imagen2      TEXT DEFAULT '',
  imagen3      TEXT DEFAULT '',
  stock        INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS productos_updated_at ON productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PEDIDOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id             BIGSERIAL PRIMARY KEY,
  fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre         TEXT NOT NULL,
  telefono       TEXT NOT NULL,
  ciudad         TEXT NOT NULL DEFAULT 'Bogotá',
  departamento   TEXT NOT NULL DEFAULT 'Cundinamarca',
  barrio         TEXT NOT NULL DEFAULT '',
  direccion      TEXT NOT NULL,
  casa           TEXT DEFAULT '',
  conjunto       TEXT DEFAULT '',
  nota           TEXT DEFAULT '',
  cupon          TEXT DEFAULT '',
  descuento      NUMERIC(12,2) DEFAULT 0,
  pago           TEXT NOT NULL,
  zona_envio     TEXT DEFAULT '',
  costo_envio    NUMERIC(12,2) DEFAULT 0,
  subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  productos      TEXT DEFAULT '',       -- resumen texto (legacy)
  productos_json JSONB DEFAULT '[]',    -- datos estructurados
  estado_pago    TEXT NOT NULL DEFAULT 'PENDIENTE',
  estado_envio   TEXT NOT NULL DEFAULT 'Recibido',
  archivado      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pedidos_telefono_idx ON pedidos(telefono);
CREATE INDEX IF NOT EXISTS pedidos_fecha_idx    ON pedidos(fecha DESC);
CREATE INDEX IF NOT EXISTS pedidos_archivado_idx ON pedidos(archivado);

-- ─── CLIENTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id             BIGSERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  telefono       TEXT NOT NULL UNIQUE,
  ciudad         TEXT DEFAULT 'Bogotá',
  barrio         TEXT DEFAULT '',
  direccion      TEXT DEFAULT '',
  primera_compra TIMESTAMPTZ DEFAULT NOW(),
  ultima_compra  TIMESTAMPTZ DEFAULT NOW(),
  total_pedidos  INTEGER DEFAULT 0,
  total_gastado  NUMERIC(14,2) DEFAULT 0,
  tipo           TEXT DEFAULT 'Nuevo',    -- Nuevo | Recurrente | VIP
  notas          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clientes_telefono_idx ON clientes(telefono);

-- ─── CALIFICACIONES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calificaciones (
  id          BIGSERIAL PRIMARY KEY,
  telefono    TEXT DEFAULT '',
  estrellas   SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario  TEXT DEFAULT '',
  aprobado    BOOLEAN DEFAULT TRUE,  -- moderación
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calificaciones_aprobado_idx ON calificaciones(aprobado, estrellas);

-- ─── CUPONES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cupones (
  id           BIGSERIAL PRIMARY KEY,
  codigo       TEXT NOT NULL UNIQUE,
  descripcion  TEXT DEFAULT '',
  tipo         TEXT NOT NULL CHECK (tipo IN ('PORCENTAJE', 'VALOR_FIJO')),
  valor        NUMERIC(12,2) NOT NULL,
  usos_maximos INTEGER,
  usos_actuales INTEGER DEFAULT 0,
  vencimiento  TIMESTAMPTZ,
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cupones_codigo_idx ON cupones(codigo);

-- ─── PROVEEDORES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  contacto   TEXT DEFAULT '',
  telefono   TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  productos  TEXT[] DEFAULT '{}',
  estado     TEXT DEFAULT 'activo',
  notas      TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FUNCIÓN: decrementar stock ───────────────────────────────
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE productos
  SET stock = GREATEST(stock - qty, 0)
  WHERE id = product_id AND stock IS NOT NULL AND stock > 0;
END;
$$ LANGUAGE plpgsql;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
-- Productos: públicos para lectura, admin para escritura
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Productos públicos" ON productos;
CREATE POLICY "Productos públicos"
  ON productos FOR SELECT TO anon, authenticated
  USING (TRUE);

-- Pedidos: solo service_role puede leer/escribir (anon inserta)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clientes insertan pedidos" ON pedidos;
CREATE POLICY "Clientes insertan pedidos"
  ON pedidos FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

-- Calificaciones: públicas para lectura, inserción libre
ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Calificaciones públicas" ON calificaciones;
CREATE POLICY "Calificaciones públicas"
  ON calificaciones FOR SELECT TO anon, authenticated
  USING (aprobado = TRUE);
DROP POLICY IF EXISTS "Clientes insertan reseñas" ON calificaciones;
CREATE POLICY "Clientes insertan reseñas"
  ON calificaciones FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

-- Cupones: solo lectura pública (validar código)
ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cupones activos públicos" ON cupones;
CREATE POLICY "Cupones activos públicos"
  ON cupones FOR SELECT TO anon, authenticated
  USING (activo = TRUE);
