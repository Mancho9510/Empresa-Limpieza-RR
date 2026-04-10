import { z } from 'zod'

/**
 * Zod Validation Schemas — Limpieza RR
 * Validación centralizada para todos los inputs del sistema.
 */

// ═══ Auth ═══════════════════════════════════════════════════

export const LoginSchema = z.object({
  password: z.string().min(1, 'La contraseña es requerida'),
})

// ═══ Productos ══════════════════════════════════════════════

export const ProductoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  tamano: z.string().max(100).optional().default(''),
  precio: z.number().min(0, 'El precio debe ser positivo'),
  costo: z.number().min(0).optional().default(0),
  categoria: z.string().max(100).optional().default(''),
  destacado: z.boolean().optional().default(false),
  emoji: z.string().max(10).optional().default(''),
  descripcion: z.string().max(2000).optional().default(''),
  imagen: z.string().url().or(z.literal('')).optional().default(''),
  imagen2: z.string().url().or(z.literal('')).optional().default(''),
  imagen3: z.string().url().or(z.literal('')).optional().default(''),
  stock: z.number().int().min(0).nullable().optional(),
})

// ═══ Pedidos ════════════════════════════════════════════════

export const PedidoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  telefono: z
    .string()
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(15)
    .regex(/^[0-9]+$/, 'Solo se aceptan números'),
  ciudad: z.string().min(1, 'La ciudad es requerida').max(100),
  departamento: z.string().min(1, 'El departamento es requerido').max(100),
  barrio: z.string().min(1, 'El barrio es requerido').max(200),
  direccion: z.string().min(1, 'La dirección es requerida').max(500),
  casa: z.string().max(200).optional().default(''),
  conjunto: z.string().max(200).optional().default(''),
  nota: z.string().max(1000).optional().default(''),
  cupon: z.string().max(50).optional().default(''),
  descuento: z.number().min(0).optional().default(0),
  pago: z.string().min(1, 'El método de pago es requerido'),
  zona_envio: z.string().optional().default(''),
  costo_envio: z.number().min(0).optional().default(0),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  productos: z.string().optional().default(''),
  productos_json: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    tamano: z.string().optional(),
    precio: z.number(),
    qty: z.number().int().min(1),
    emoji: z.string().optional(),
  })).optional().default([]),
})

export const ActualizarEstadoSchema = z.object({
  id: z.number().int().positive(),
  campo: z.enum(['estado_pago', 'estado_envio']),
  valor: z.string().min(1),
})

export const ModificarPedidoSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  ciudad: z.string().optional(),
  barrio: z.string().optional(),
  direccion: z.string().optional(),
  nota: z.string().optional(),
  total: z.number().min(0).optional(),
  productos: z.string().optional(),
  productos_json: z.any().optional(),
})

// ═══ Cupones ════════════════════════════════════════════════

export const CuponSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(50)
    .transform((v) => v.toUpperCase().trim()),
  descripcion: z.string().max(500).optional().default(''),
  tipo: z.enum(['PORCENTAJE', 'VALOR_FIJO']),
  valor: z.number().positive('El valor debe ser positivo'),
  usos_maximos: z.number().int().positive().optional(),
  vencimiento: z.string().datetime().optional(),
  activo: z.boolean().optional().default(true),
})

export const ValidarCuponSchema = z.object({
  code: z.string().min(1).max(50),
})

// ═══ Calificaciones ═════════════════════════════════════════

export const CalificacionSchema = z.object({
  telefono: z.string().optional().default(''),
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional().default(''),
})

// ═══ Stock ══════════════════════════════════════════════════

export const ActualizarStockSchema = z.object({
  id: z.string().min(1),
  stock: z.number().int().min(0),
})

export const ActualizarPrecioSchema = z.object({
  id: z.string().min(1),
  precio: z.number().min(0),
})

export const ActualizarCostoSchema = z.object({
  id: z.string().min(1),
  costo: z.number().min(0),
})

// ═══ Teléfono (para historial/estado) ═══════════════════════

export const TelefonoSchema = z.object({
  telefono: z
    .string()
    .min(7)
    .max(15)
    .regex(/^[0-9]+$/),
})

// ═══ Proveedores ════════════════════════════════════════════

export const ProveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  contacto: z.string().max(200).optional().default(''),
  telefono: z.string().max(20).optional().default(''),
  email: z.string().email().or(z.literal('')).optional().default(''),
  productos: z.array(z.string()).optional().default([]),
  estado: z.enum(['activo', 'inactivo']).optional().default('activo'),
  notas: z.string().max(2000).optional().default(''),
})
