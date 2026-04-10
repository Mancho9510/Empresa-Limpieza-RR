/**
 * API Client — Limpieza RR
 * Funciones typed para hacer fetch desde Client Components al API.
 */

const BASE = '/api'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Productos ──────────────────────────────────────────────
export function fetchProductos() {
  return apiFetch<{ ok: boolean; data: ProductoAPI[] }>('/productos')
}

export function postProductoAccion(accion: string, data: Record<string, unknown>) {
  return apiFetch<{ ok: boolean }>('/productos', {
    method: 'POST',
    body: JSON.stringify({ accion, ...data }),
  })
}

// ─── Pedidos ────────────────────────────────────────────────
export function postPedido(pedido: Record<string, unknown>) {
  return apiFetch<{ ok: boolean; id?: number; error?: string }>('/pedidos', {
    method: 'POST',
    body: JSON.stringify(pedido),
  })
}

export function postAccionPedido(accion: string, data: Record<string, unknown>) {
  return apiFetch<{ ok: boolean }>('/pedidos', {
    method: 'POST',
    body: JSON.stringify({ accion, ...data }),
  })
}

export function fetchPedidos(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ ok: boolean; data: PedidoAPI[] }>(`/pedidos${qs}`)
}

// ─── Historial / Estado ─────────────────────────────────────
export function fetchHistorial(telefono: string) {
  return apiFetch<{ ok: boolean; data: PedidoAPI[] }>(`/historial?telefono=${telefono}`)
}

export function fetchEstado(telefono: string) {
  return apiFetch<{ ok: boolean; data: PedidoAPI | null }>(`/estado?telefono=${telefono}`)
}

// ─── Cupones ────────────────────────────────────────────────
export function validarCupon(code: string) {
  return apiFetch<{
    ok: boolean
    error?: string
    cupon?: { code: string; type: 'pct' | 'fixed'; value: number; label: string }
  }>(`/cupones?code=${encodeURIComponent(code)}`)
}

// ─── Reseñas ────────────────────────────────────────────────
export function fetchResenas() {
  return apiFetch<{
    ok: boolean
    data: CalificacionAPI[]
    stats: { total: number; avg: number }
  }>('/resenas')
}

export function postResena(data: { telefono?: string; estrellas: number; comentario?: string }) {
  return apiFetch<{ ok: boolean }>('/resenas', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Clientes ────────────────────────────────────────────────
export function fetchClientes(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ ok: boolean; data: ClienteAPI[] }>(`/clientes${qs}`)
}

// ─── Proveedores ──────────────────────────────────────────────
export function fetchProveedores(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ ok: boolean; data: ProveedorAPI[] }>(`/proveedores${qs}`)
}

export function postProveedor(data: Record<string, unknown>) {
  return apiFetch<{ ok: boolean }>('/proveedores', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Dashboard ──────────────────────────────────────────────
export function fetchDashboard() {
  return apiFetch<{ ok: boolean; data: DashboardAPI }>('/dashboard')
}

// ─── Rentabilidad ───────────────────────────────────────────
export function fetchRentabilidad(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch<{ ok: boolean; data: RentabilidadAPI }>(`/rentabilidad${qs}`)
}


// ─── Auth ───────────────────────────────────────────────────
export function postLogin(password: string) {
  return apiFetch<{ ok: boolean; error?: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function postLogout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}

// ─── Types ──────────────────────────────────────────────────
export interface ProductoAPI {
  id: string
  nombre: string
  tamano: string
  precio: number
  costo: number
  categoria: string
  destacado: boolean
  emoji: string
  descripcion: string
  imagen: string
  imagen2: string
  imagen3: string
  stock: number | null
  created_at: string
  updated_at: string
}

export interface PedidoAPI {
  id: number
  fecha: string
  nombre: string
  telefono: string
  ciudad: string
  departamento: string
  barrio: string
  direccion: string
  casa: string
  conjunto: string
  nota: string
  cupon: string
  descuento: number
  pago: string
  zona_envio: string
  costo_envio: number
  subtotal: number
  total: number
  estado_pago: string
  estado_envio: string
  productos: string
  productos_json: Array<{ id: string; nombre: string; tamano?: string; precio: number; qty: number; emoji?: string }>
  archivado: boolean
}

export interface CalificacionAPI {
  id: number
  telefono: string
  estrellas: number
  comentario: string
  created_at: string
}

export interface DashboardAPI {
  hoy: { pedidos: number; total: number }
  mes: { pedidos: number; total: number }
  general: { totalPedidos: number; totalGeneral: number; pendientes: number; ticketPromedio: number }
  estados: Record<string, number>
  clientes: { total: number; vip: number }
  rating: { total: number; avg: number }
  topProductos: Array<{ nombre: string; qty: number }>
}

export interface ClienteAPI {
  id: number
  nombre: string
  telefono: string
  ciudad: string
  barrio: string
  direccion: string
  primera_compra: string
  ultima_compra: string
  total_pedidos: number
  total_gastado: number
  tipo: string
  created_at: string
}

export interface RentabilidadAPI {
  totalPedidos: number
  totalIngresos: number
  totalCostos: number
  gananciaNeta: number
  margenGeneral: number
  productosVendidos: Array<{
    id: string
    nombre: string
    tamano: string
    qty: number
    ingresoBruto: number
    costoOp: number
    gananciaNeta: number
    margen: number
  }>
}

export interface ProveedorAPI {
  id: number
  nombre: string
  contacto: string
  telefono: string
  email: string
  estado: string
  notas: string
  created_at: string
}
