-- ══════════════════════════════════════════════════════════════
-- LIMPIEZA RR — Schema Supabase
-- Ejecutar en: Supabase > SQL Editor
-- Estructura exacta según Google Sheets + especificaciones del equipo
-- ══════════════════════════════════════════════════════════════

-- ─── 1. CALIFICACIONES ────────────────────────────────────────
-- Columnas: fecha, nombre, telefono, estrellas, comentario
DROP TABLE IF EXISTS calificaciones CASCADE;
CREATE TABLE calificaciones (
  id          BIGSERIAL PRIMARY KEY,
  fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre      TEXT        NOT NULL DEFAULT '',
  telefono    TEXT        NOT NULL DEFAULT '',
  estrellas   SMALLINT    NOT NULL DEFAULT 5 CHECK (estrellas BETWEEN 1 AND 5),
  comentario  TEXT        NOT NULL DEFAULT ''
);

-- ─── 2. PRODUCTOS ─────────────────────────────────────────────
-- Columnas: id, nombre, tamano, precio, costo, categoria,
--           destacado, emoji, descripcion, imagen, imagen2, imagen3, stock
DROP TABLE IF EXISTS productos CASCADE;
CREATE TABLE productos (
  id          BIGSERIAL PRIMARY KEY,
  nombre      TEXT             NOT NULL DEFAULT '',
  tamano      TEXT             NOT NULL DEFAULT '',
  precio      NUMERIC(12,2)    NOT NULL DEFAULT 0,
  costo       NUMERIC(12,2)    NOT NULL DEFAULT 0,
  categoria   TEXT             NOT NULL DEFAULT '',
  destacado   BOOLEAN          NOT NULL DEFAULT FALSE,
  emoji       TEXT             NOT NULL DEFAULT '',
  descripcion TEXT             NOT NULL DEFAULT '',
  imagen      TEXT             NOT NULL DEFAULT '',
  imagen2     TEXT             NOT NULL DEFAULT '',
  imagen3     TEXT             NOT NULL DEFAULT '',
  stock       INTEGER          NOT NULL DEFAULT 0
);

-- ─── 3. PEDIDOS ───────────────────────────────────────────────
-- Columnas: fecha, nombre, telefono, ciudad, departamento, barrio,
--           direccion, casa, conjunto, nota, cupon, descuento, pago,
--           zona_envio, costo_envio, subtotal, total, estado_pago,
--           estado_envio, productos, productos_json, archivado
DROP TABLE IF EXISTS pedidos CASCADE;
CREATE TABLE pedidos (
  id            BIGSERIAL PRIMARY KEY,
  fecha         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  nombre        TEXT             NOT NULL DEFAULT '',
  telefono      TEXT             NOT NULL DEFAULT '',
  ciudad        TEXT             NOT NULL DEFAULT '',
  departamento  TEXT             NOT NULL DEFAULT '',
  barrio        TEXT             NOT NULL DEFAULT '',
  direccion     TEXT             NOT NULL DEFAULT '',
  casa          TEXT             NOT NULL DEFAULT '',
  conjunto      TEXT             NOT NULL DEFAULT '',
  nota          TEXT             NOT NULL DEFAULT '',
  cupon         TEXT             NOT NULL DEFAULT '',
  descuento     NUMERIC(12,2)    NOT NULL DEFAULT 0,
  pago          TEXT             NOT NULL DEFAULT '',
  zona_envio    TEXT             NOT NULL DEFAULT '',
  costo_envio   NUMERIC(12,2)    NOT NULL DEFAULT 0,
  subtotal      NUMERIC(12,2)    NOT NULL DEFAULT 0,
  total         NUMERIC(12,2)    NOT NULL DEFAULT 0,
  estado_pago   TEXT             NOT NULL DEFAULT 'PENDIENTE',
  estado_envio  TEXT             NOT NULL DEFAULT 'Recibido',
  productos     TEXT             NOT NULL DEFAULT '',
  productos_json JSONB           NOT NULL DEFAULT '[]',
  archivado     BOOLEAN          NOT NULL DEFAULT FALSE
);

-- ─── 4. CLIENTES ──────────────────────────────────────────────
-- Columnas: primera_compra, ultima_compra, nombre, telefono, ciudad,
--           barrio, direccion, total_pedidos, total_gastado, tipo,
--           ultimos_pedidos, productos_favoritos, frecuencia
DROP TABLE IF EXISTS clientes CASCADE;
CREATE TABLE clientes (
  id                  BIGSERIAL PRIMARY KEY,
  primera_compra      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ultima_compra       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  nombre              TEXT          NOT NULL DEFAULT '',
  telefono            TEXT          NOT NULL DEFAULT '' UNIQUE,
  ciudad              TEXT          NOT NULL DEFAULT '',
  barrio              TEXT          NOT NULL DEFAULT '',
  direccion           TEXT          NOT NULL DEFAULT '',
  total_pedidos       INTEGER       NOT NULL DEFAULT 0,
  total_gastado       NUMERIC(14,2) NOT NULL DEFAULT 0,
  tipo                TEXT          NOT NULL DEFAULT 'Nuevo',
  ultimos_pedidos     INTEGER       NOT NULL DEFAULT 0,
  productos_favoritos TEXT          NOT NULL DEFAULT '',
  frecuencia          NUMERIC(6,2)  NOT NULL DEFAULT 0
);

-- ─── 5. PROVEEDORES ───────────────────────────────────────────
-- Columnas: nombre, contacto_nombre, telefono, email, productos,
--           direccion, nota, fecha_registro, activo
DROP TABLE IF EXISTS proveedores CASCADE;
CREATE TABLE proveedores (
  id               BIGSERIAL PRIMARY KEY,
  nombre           TEXT        NOT NULL DEFAULT '',
  contacto_nombre  TEXT        NOT NULL DEFAULT '',
  telefono         TEXT        NOT NULL DEFAULT '',
  email            TEXT        NOT NULL DEFAULT '',
  productos        TEXT        NOT NULL DEFAULT '',
  direccion        TEXT        NOT NULL DEFAULT '',
  nota             TEXT        NOT NULL DEFAULT '',
  fecha_registro   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo           BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ─── 6. CUPONES ───────────────────────────────────────────────
-- Columnas: codigo, descripcion, tipo, valor, usos_maximos,
--           usos_actuales, vencimiento, activo
DROP TABLE IF EXISTS cupones CASCADE;
CREATE TABLE cupones (
  id            BIGSERIAL PRIMARY KEY,
  codigo        TEXT          NOT NULL UNIQUE,
  descripcion   TEXT          NOT NULL DEFAULT '',
  tipo          TEXT          NOT NULL DEFAULT 'pct',   -- 'pct' | 'fixed'
  valor         NUMERIC(12,2) NOT NULL DEFAULT 0,
  usos_maximos  INTEGER       NOT NULL DEFAULT 0,       -- 0 = sin límite
  usos_actuales INTEGER       NOT NULL DEFAULT 0,
  vencimiento   TIMESTAMPTZ,                             -- NULL = sin vencimiento
  activo        BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ══════════════════════════════════════════════════════════════
-- ÍNDICES para consultas frecuentes
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_pedidos_telefono   ON pedidos(telefono);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha      ON pedidos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_archivado  ON pedidos(archivado);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono  ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_calificaciones_fecha ON calificaciones(fecha DESC);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — habilitar pero sin restricciones
-- (el acceso se controla a nivel de API con service_role_key)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupones         ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura (tienda)
CREATE POLICY "public_read_productos"      ON productos      FOR SELECT USING (true);
CREATE POLICY "public_read_calificaciones" ON calificaciones FOR SELECT USING (true);
CREATE POLICY "public_read_cupones"        ON cupones        FOR SELECT USING (activo = true);

-- Inserciones públicas (clientes hacen pedidos y reseñas)
CREATE POLICY "public_insert_pedidos"      ON pedidos        FOR INSERT WITH CHECK (true);
CREATE POLICY "public_insert_calificaciones" ON calificaciones FOR INSERT WITH CHECK (true);
