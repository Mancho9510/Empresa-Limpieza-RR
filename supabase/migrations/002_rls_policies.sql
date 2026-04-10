-- ══════════════════════════════════════════════════════════════
-- LIMPIEZA RR — Row Level Security Policies
-- Supabase PostgreSQL Migration 002
-- ══════════════════════════════════════════════════════════════

-- ═══ PRODUCTOS ══════════════════════════════════════════════
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Público: cualquiera puede leer productos
CREATE POLICY "productos_public_read" ON productos
  FOR SELECT
  USING (true);

-- Solo service_role puede modificar
CREATE POLICY "productos_admin_write" ON productos
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "productos_admin_update" ON productos
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "productos_admin_delete" ON productos
  FOR DELETE
  TO service_role
  USING (true);

-- ═══ PEDIDOS ════════════════════════════════════════════════
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Público: puede crear pedidos (INSERT desde la tienda)
CREATE POLICY "pedidos_public_insert" ON pedidos
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- service_role: lectura y escritura completa
CREATE POLICY "pedidos_service_all" ON pedidos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- anon: puede leer pedidos por teléfono (historial/estado)
-- Se valida el teléfono en el Route Handler, no en RLS
-- para simplificar (no hay sesión de usuario final)
CREATE POLICY "pedidos_anon_read" ON pedidos
  FOR SELECT
  TO anon
  USING (true);

-- ═══ CLIENTES ═══════════════════════════════════════════════
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Solo service_role
CREATE POLICY "clientes_service_all" ON clientes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon: no puede leer clientes (datos sensibles)
-- Los pedidos públicos se consultan por teléfono via API

-- ═══ CUPONES ════════════════════════════════════════════════
ALTER TABLE cupones ENABLE ROW LEVEL SECURITY;

-- Público: leer cupones activos (para validar en checkout)
CREATE POLICY "cupones_public_read_active" ON cupones
  FOR SELECT
  TO anon
  USING (activo = true);

-- service_role: todo
CREATE POLICY "cupones_service_all" ON cupones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══ CALIFICACIONES ═════════════════════════════════════════
ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;

-- Público: puede insertar y leer calificaciones
CREATE POLICY "calificaciones_public_insert" ON calificaciones
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "calificaciones_public_read" ON calificaciones
  FOR SELECT
  USING (true);

-- service_role: todo
CREATE POLICY "calificaciones_service_all" ON calificaciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══ PROVEEDORES ════════════════════════════════════════════
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Solo service_role
CREATE POLICY "proveedores_service_all" ON proveedores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══ ADMIN_USERS ════════════════════════════════════════════
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede acceder
CREATE POLICY "admin_users_service_only" ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
