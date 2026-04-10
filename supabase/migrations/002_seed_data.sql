-- ═══════════════════════════════════════════════════════════════
-- Limpieza RR — Datos Semilla (Seed)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- NOTA: Las tablas ya existen. Este script solo inserta datos de 
-- ejemplo para que las páginas tengan contenido visible.
-- ═══════════════════════════════════════════════════════════════

-- ─── Calificaciones (Reseñas) ─────────────────────────────────
INSERT INTO calificaciones (telefono, estrellas, comentario, aprobado) VALUES
  ('3001111001', 5, 'Excelentes productos, el eliminador de olores es increíble. Mi casa siempre huele rico 🌸', true),
  ('3102222002', 5, 'El desengrasante es lo mejor que he probado, limpia todo en segundos. ¡Muy recomendado!', true),
  ('3203333003', 5, 'Pedí por primera vez y quedé encantada. Llegó rápido y los productos son de muy buena calidad ✨', true),
  ('3144444004', 5, 'El multiusos funciona genial en la cocina y el baño. Definitivamente volvería a comprar.', true),
  ('3215555005', 5, 'Las fragancias son espectaculares. Mi favorito es el de lavanda, deja el ambiente fresco todo el día 💜', true),
  ('3186666006', 4, 'Atención excelente, precios justos y entrega puntual. 100% recomendado para el hogar.', true),
  ('3007777007', 5, 'El jabón antibacterial dura muchísimo y la espuma es perfecta. No cambio de marca 🙌', true),
  ('3108888008', 5, 'Compré el pack de aseo completo y fue una excelente inversión. Efectividad al 100%.', true)
ON CONFLICT DO NOTHING;

-- ─── Cupones ──────────────────────────────────────────────────
INSERT INTO cupones (codigo, descripcion, tipo, valor, usos_maximos, activo) VALUES
  ('BIENVENIDO10', 'Descuento de bienvenida 10%', 'PORCENTAJE', 10, 100, true),
  ('PRIMERACOMPRA', 'Primera compra con descuento', 'PORCENTAJE', 15, 50, true),
  ('AHORRA5000', 'Descuento fijo de $5.000', 'VALOR_FIJO', 5000, 200, true),
  ('LIQUIDACION', 'Descuento especial de temporada 20%', 'PORCENTAJE', 20, 30, false)
ON CONFLICT (codigo) DO NOTHING;

-- ─── Proveedores ──────────────────────────────────────────────
INSERT INTO proveedores (nombre, contacto, telefono, email, estado, notas) VALUES
  ('Distribuidora Química Nacional', 'Carlos Ruiz', '3101234567', 'ventas@dqn.com.co', 'activo', 'Proveedor principal de productos base'),
  ('Aromas y Fragancias SAS', 'María López', '3209876543', 'fragancias@af.com.co', 'activo', 'Proveedor de esencias y aromas'),
  ('Plastiqueros del Norte', 'Jorge Herrera', '3154321098', '', 'activo', 'Envases y empaques plásticos'),
  ('Insumos Colombia Ltda', 'Sandra Jiménez', '3007654321', 'insumos@icl.com', 'inactivo', 'Proveedor secundario, pausado por precios')
ON CONFLICT DO NOTHING;

-- ─── Verificar tablas ─────────────────────────────────────────
SELECT 'calificaciones' as tabla, COUNT(*) as registros FROM calificaciones
UNION ALL
SELECT 'cupones', COUNT(*) FROM cupones
UNION ALL  
SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL
SELECT 'pedidos', COUNT(*) FROM pedidos
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes;
