#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  LIMPIEZA RR — Script de setup del proyecto
#  Ejecutar UNA SOLA VEZ en la carpeta raíz del proyecto
#  Uso: bash setup.sh
# ═══════════════════════════════════════════════════════════════

set -e  # Detener si hay error

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Limpieza RR — Creando estructura   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Crear todas las carpetas ──────────────────────────────
echo "📁 Creando carpetas..."

mkdir -p src/js/modules/admin
mkdir -p src/js/modules/ui
mkdir -p src/js/helpers
mkdir -p src/css
mkdir -p src/assets/icons
mkdir -p apps-script
mkdir -p dist

echo "   ✓ src/js/modules/admin"
echo "   ✓ src/js/modules/ui"
echo "   ✓ src/js/helpers"
echo "   ✓ src/css"
echo "   ✓ src/assets/icons"
echo "   ✓ apps-script"
echo "   ✓ dist"

# ── 2. Crear package.json ────────────────────────────────────
echo ""
echo "📦 Creando package.json..."
cat > package.json << 'EOF'
{
  "name": "limpieza-rr",
  "version": "2.0.0",
  "description": "Tienda web + panel admin para Limpieza RR",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20"
  }
}
EOF
echo "   ✓ package.json"

# ── 3. Crear vite.config.js ──────────────────────────────────
echo ""
echo "⚡ Creando vite.config.js..."
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Carpeta raíz donde Vite busca los archivos fuente
  root: 'src',

  // Carpeta de salida del build (relativa a la raíz del proyecto)
  build: {
    outDir: '../dist',
    emptyOutDir: true,

    // Múltiples entry points: tienda y admin como páginas separadas
    rollupOptions: {
      input: {
        main:  resolve(__dirname, 'src/index.html'),
        admin: resolve(__dirname, 'src/admin.html'),
      },
    },
  },

  // Servidor de desarrollo
  server: {
    port: 3000,
    open: true,    // Abre el navegador automáticamente
  },
})
EOF
echo "   ✓ vite.config.js"

# ── 4. Crear tailwind.config.js ──────────────────────────────
echo ""
echo "🎨 Creando tailwind.config.js..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  // JIT: solo genera CSS para las clases que realmente usas
  // Tailwind escanea estos archivos para saber qué clases incluir
  content: [
    './src/**/*.html',
    './src/**/*.js',
  ],

  // Modo oscuro basado en la clase .dark en el <html>
  darkMode: 'class',

  theme: {
    extend: {
      // Colores personalizados de Limpieza RR
      colors: {
        teal: {
          50:  '#f0fdf9',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
      },

      // Tipografía del proyecto
      fontFamily: {
        sans:    ['Outfit', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },

      // Animaciones personalizadas
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up':   'fadeUp .25s ease both',
        'shimmer':   'shimmer 1.4s infinite',
        'spin-slow': 'spin .7s linear infinite',
      },
    },
  },

  plugins: [],
}
EOF
echo "   ✓ tailwind.config.js"

# ── 5. Crear postcss.config.js ───────────────────────────────
echo ""
echo "🔧 Creando postcss.config.js..."
cat > postcss.config.js << 'EOF'
// PostCSS procesa el CSS:
// 1. tailwindcss: genera las clases de Tailwind
// 2. autoprefixer: agrega prefijos -webkit-, -moz- automáticamente
export default {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},
  },
}
EOF
echo "   ✓ postcss.config.js"

# ── 6. Crear .gitignore ──────────────────────────────────────
echo ""
echo "🙈 Creando .gitignore..."
cat > .gitignore << 'EOF'
# Dependencias de Node (nunca subir al repositorio)
node_modules/

# Carpeta de build generada automáticamente
dist/

# Variables de entorno (claves privadas)
.env
.env.local
.env.*.local

# Archivos del sistema operativo
.DS_Store
Thumbs.db

# Editores de código
.vscode/settings.json
.idea/
*.swp
*.swo

# Logs
npm-debug.log*
yarn-error.log
EOF
echo "   ✓ .gitignore"

# ── 7. Crear src/input.css (entry point de Tailwind) ─────────
echo ""
echo "🎨 Creando archivos CSS base..."
cat > src/input.css << 'EOF'
/* Entry point de Tailwind CSS */
/* Vite procesa este archivo y genera el CSS final en dist/ */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Importar módulos CSS del proyecto */
@import './css/base.css';
@import './css/components.css';
@import './css/layout.css';
@import './css/animations.css';
@import './css/responsive.css';
EOF

# ── 8. Crear archivos CSS modulares (vacíos con comentario) ──
cat > src/css/base.css << 'EOF'
/* ══════════════════════════════════════════════════
   BASE.CSS — Variables, reset, tipografía, scrollbar
   ══════════════════════════════════════════════════ */

/* Variables CSS globales del proyecto */
:root {
  --teal:      #0D9488;
  --teal-l:    #14B8A6;
  --teal-pale: #CCFBF1;
  --teal-dk:   #0F766E;
  --yellow:    #F59E0B;
  --bg:        #F0FDF9;
  --white:     #FFFFFF;
  --gray:      #64748B;
  --text:      #0F172A;
  --border:    #99F6E4;
  --sh:        0 4px 20px rgba(13, 148, 136, 0.10);
  --sh-lg:     0 16px 48px rgba(13, 148, 136, 0.18);
  --r:         16px;
  --r-lg:      24px;
}

/* Reset básico */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html { scroll-behavior: smooth; }

body {
  font-family: 'Outfit', sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

/* Scrollbar personalizada */
::-webkit-scrollbar       { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
EOF

cat > src/css/components.css << 'EOF'
/* ══════════════════════════════════════════════════
   COMPONENTS.CSS — Botones, cards, badges, modales,
                    carrito, carrusel, formularios
   ══════════════════════════════════════════════════ */

/* Los estilos de componentes van aquí */
/* Este archivo se irá llenando en la Fase 2 */
EOF

cat > src/css/layout.css << 'EOF'
/* ══════════════════════════════════════════════════
   LAYOUT.CSS — Nav, Hero, Secciones, Footer, Grid
   ══════════════════════════════════════════════════ */

/* Los estilos de layout van aquí */
/* Este archivo se irá llenando en la Fase 2 */
EOF

cat > src/css/animations.css << 'EOF'
/* ══════════════════════════════════════════════════
   ANIMATIONS.CSS — Keyframes, transiciones,
                    skeletons, fade-in scroll
   ══════════════════════════════════════════════════ */

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .5; }
}

/* Clases de animación */
.animate-fade-up  { animation: fadeUp .25s ease both; }
.animate-spin-slow{ animation: spin .7s linear infinite; }
.animate-pulse    { animation: pulse 2s infinite; }

/* Fade-in al hacer scroll (clase .fi + IntersectionObserver en JS) */
.fi {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity .6s ease, transform .6s ease;
}
.fi.vis {
  opacity: 1;
  transform: translateY(0);
}
EOF

cat > src/css/responsive.css << 'EOF'
/* ══════════════════════════════════════════════════
   RESPONSIVE.CSS — Media queries, mobile-first,
                    ajustes de pantalla
   ══════════════════════════════════════════════════ */

/* Los estilos responsivos van aquí */
/* Este archivo se irá llenando en la Fase 2 */
EOF

echo "   ✓ src/input.css"
echo "   ✓ src/css/base.css"
echo "   ✓ src/css/components.css"
echo "   ✓ src/css/layout.css"
echo "   ✓ src/css/animations.css"
echo "   ✓ src/css/responsive.css"

# ── 9. Crear archivos JS (módulos vacíos con comentarios) ────
echo ""
echo "⚙️  Creando archivos JavaScript modulares..."

cat > src/js/helpers/format.js << 'EOF'
/**
 * format.js — Funciones de formato y utilidades
 * Helpers puros: no acceden al DOM, no hacen fetch.
 * Se pueden importar en cualquier módulo.
 */

/**
 * Formatea un número como precio colombiano
 * Ejemplo: fmt(16000) → "$ 16.000"
 */
export function fmt(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

/**
 * Convierte URLs de Google Drive al formato de imagen directa
 * Soporta: /file/d/ID/view y ?id=ID
 */
export function sanitizeImgUrl(url) {
  if (!url || url.trim() === '') return ''
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (matchFile) return `https://drive.google.com/uc?export=view&id=${matchFile[1]}`
  const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (matchOpen) return `https://drive.google.com/uc?export=view&id=${matchOpen[1]}`
  if (url.startsWith('http')) return url
  return ''
}

/**
 * Normaliza un número de teléfono colombiano
 * Ejemplo: "57300123456" → "300123456"
 */
export function normalizeTel(value) {
  let tel = String(value || '').replace(/\D/g, '')
  if (tel.length === 12 && tel.startsWith('57')) tel = tel.slice(2)
  return tel
}
EOF

cat > src/js/helpers/validators.js << 'EOF'
/**
 * validators.js — Funciones de validación de formularios
 */

/**
 * Valida que un teléfono tenga entre 7 y 15 dígitos
 */
export function isValidPhone(tel) {
  return /^[0-9]{7,15}$/.test(String(tel).replace(/\s/g, ''))
}

/**
 * Valida que los campos obligatorios del pedido estén completos
 * Retorna: { ok: boolean, campo: string | null }
 */
export function validateOrderForm(data) {
  const required = ['nombre', 'telefono', 'ciudad', 'departamento', 'barrio', 'direccion']
  for (const campo of required) {
    if (!data[campo] || String(data[campo]).trim() === '') {
      return { ok: false, campo }
    }
  }
  if (!isValidPhone(data.telefono)) {
    return { ok: false, campo: 'telefono' }
  }
  return { ok: true, campo: null }
}
EOF

cat > src/js/modules/api.js << 'EOF'
/**
 * api.js — Capa de acceso a Google Apps Script
 * Todas las llamadas al backend pasan por aquí.
 *
 * IMPORTANTE: Cambia APPS_SCRIPT_URL por tu URL real.
 */

// ── Configuración ──────────────────────────────────────────
export const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby-dGGJrYSeWPHPscyzIP5ndwA519NZzRpJHSh7TFylsQIooLzRL0qS4Ge2CxNy6CHo/exec',
  WA_NUMBER:  '573503443140',
  PAY_NUMBER: '3203346819',
  PAY_HOLDER: 'Limpieza RR',
  AUTOPLAY_MS: 4200,
}

// ── TTL del caché de productos (30 minutos) ────────────────
const CACHE_KEY = 'lrr_prods_v1'
const CACHE_TTL = 30 * 60 * 1000

// ── GET: obtener datos públicos ────────────────────────────

export async function fetchProductos() {
  const cached = getCachedProducts()
  if (cached) return cached

  const url = `${CONFIG.APPS_SCRIPT_URL}?action=productos&t=${Date.now()}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'Error del servidor')
  setCachedProducts(json.data)
  return json.data
}

export async function fetchCupon(code) {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=cupon&code=${encodeURIComponent(code)}`
  const res  = await fetch(url)
  const json = await res.json()
  return json
}

export async function fetchHistorial(telefono) {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=historial&telefono=${encodeURIComponent(telefono)}&t=${Date.now()}`
  const res  = await fetch(url)
  const text = await res.text()
  return JSON.parse(text)
}

export async function fetchEstado(telefono) {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=estado&telefono=${encodeURIComponent(telefono)}&t=${Date.now()}`
  const res  = await fetch(url)
  const text = await res.text()
  return JSON.parse(text)
}

export async function fetchResenas() {
  const url = `${CONFIG.APPS_SCRIPT_URL}?action=resenas&t=${Date.now()}`
  const res  = await fetch(url)
  return await res.json()
}

// ── POST: guardar datos ────────────────────────────────────

export async function postPedido(orderData) {
  return await postJSON(orderData)
}

export async function postCalificacion(data) {
  return await postJSON({ accion: 'calificacion', ...data })
}

// ── Helper POST interno ────────────────────────────────────
async function postJSON(body) {
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(body),
    })
  } catch (err) {
    console.error('API POST error:', err)
  }
}

// ── Caché localStorage ─────────────────────────────────────
export function getCachedProducts(allowStale = false) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (!allowStale && Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return data
  } catch { return null }
}

function setCachedProducts(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function clearProductCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}
EOF

cat > src/js/modules/cart.js << 'EOF'
/**
 * cart.js — Estado y lógica del carrito de compras
 *
 * El carrito es un array de { id, qty }.
 * Este módulo no toca el DOM directamente — eso le corresponde
 * a los event listeners de app.js o a funciones render separadas.
 */

import { fmt } from '../helpers/format.js'

// Estado del carrito (array de { id, qty })
let cart = []

// Cupón activo: null o { code, type, value, label }
let activeCoupon = null

// ── Getters ───────────────────────────────────────────────

export function getCart()         { return [...cart] }
export function getActiveCoupon() { return activeCoupon }
export function getItemCount()    { return cart.reduce((s, i) => s + i.qty, 0) }

// ── Mutaciones ────────────────────────────────────────────

/**
 * Agrega un producto al carrito
 * @param {number} id  - ID del producto
 * @param {number} qty - Cantidad a agregar
 * @param {object} [product] - Datos del producto (para validar stock)
 */
export function addItem(id, qty, product = null) {
  // Validar stock si existe
  if (product?.stock !== null && product?.stock !== undefined && product?.stock !== '') {
    const stockNum  = Number(product.stock)
    const enCarrito = cart.find(x => x.id === id)?.qty || 0
    if (!isNaN(stockNum) && enCarrito + qty > stockNum) {
      return { ok: false, reason: `Solo quedan ${stockNum} unidades` }
    }
  }
  const existing = cart.find(x => x.id === id)
  if (existing) existing.qty += qty
  else cart.push({ id, qty })
  return { ok: true }
}

export function updateQty(id, delta) {
  const item = cart.find(x => x.id === id)
  if (!item) return
  item.qty += delta
  if (item.qty <= 0) removeItem(id)
}

export function removeItem(id) {
  cart = cart.filter(x => x.id !== id)
}

export function clearCart() {
  cart = []
  activeCoupon = null
}

// ── Cálculos ──────────────────────────────────────────────

/**
 * Calcula el subtotal dado un array de productos
 * @param {Array} products - Array de productos (del módulo api)
 */
export function calcSubtotal(products) {
  return cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.id)
    return sum + (p ? p.price * item.qty : 0)
  }, 0)
}

export function calcDiscount(subtotal) {
  if (!activeCoupon) return 0
  if (activeCoupon.type === 'pct')   return Math.round(subtotal * activeCoupon.value / 100)
  if (activeCoupon.type === 'fixed') return Math.min(activeCoupon.value, subtotal)
  return 0
}

export function applyCoupon(couponData) {
  activeCoupon = couponData
}

export function removeCoupon() {
  activeCoupon = null
}
EOF

cat > src/js/modules/ui/toast.js << 'EOF'
/**
 * toast.js — Sistema de notificaciones toast
 *
 * Uso:
 *   import { showToast } from './ui/toast.js'
 *   showToast('✅ Producto agregado')
 */

export function showToast(msg, duration = 3000) {
  // Eliminar toast anterior si existe
  document.querySelector('.toast-msg')?.remove()

  const t = document.createElement('div')
  t.className = 'toast-msg'
  t.textContent = msg

  // Estilos inline para que funcione antes de que cargue el CSS
  Object.assign(t.style, {
    position:    'fixed',
    bottom:      '112px',
    left:        '50%',
    transform:   'translateX(-50%) translateY(80px)',
    background:  '#0F766E',
    color:       '#fff',
    borderRadius: '50px',
    padding:     '13px 28px',
    fontWeight:  '600',
    fontSize:    '.9rem',
    zIndex:      '9999',
    transition:  'transform .4s cubic-bezier(.4,0,.2,1)',
    whiteSpace:  'nowrap',
    boxShadow:   '0 16px 48px rgba(13,148,136,.18)',
    pointerEvents: 'none',
  })

  document.body.appendChild(t)
  requestAnimationFrame(() => {
    t.style.transform = 'translateX(-50%) translateY(0)'
  })

  setTimeout(() => {
    t.style.transform = 'translateX(-50%) translateY(80px)'
    setTimeout(() => t.remove(), 400)
  }, duration)
}
EOF

# Módulos admin (vacíos con estructura base)
cat > src/js/modules/admin/index.js << 'EOF'
/**
 * admin/index.js — Entry point del panel de administración
 *
 * Importa y conecta todos los módulos del admin.
 * Se divide en archivos separados por responsabilidad:
 *
 *   auth.js       → login / logout
 *   tabs.js       → navegación entre pestañas
 *   pedidos.js    → gestión de pedidos
 *   inventario.js → gestión de stock y costos
 *   clientes.js   → visualización de clientes
 *   proveedores.js→ visualización de proveedores
 *   dashboard.js  → métricas y KPIs
 *   rentabilidad.js → cálculos de márgenes
 */

// TODO: Los módulos admin se poblarán en la Fase 3
// Por ahora, el admin.js original funciona como fallback
EOF

echo "   ✓ src/js/helpers/format.js"
echo "   ✓ src/js/helpers/validators.js"
echo "   ✓ src/js/modules/api.js"
echo "   ✓ src/js/modules/cart.js"
echo "   ✓ src/js/modules/ui/toast.js"
echo "   ✓ src/js/modules/admin/index.js"

# ── 10. Crear src/index.html (tienda) ────────────────────────
echo ""
echo "🌐 Creando src/index.html..."
cat > src/index.html << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Limpieza RR – Productos de Aseo Premium</title>
  <meta name="description" content="Productos de aseo premium para tu hogar. Pedidos por WhatsApp con entrega en Bogotá.">

  <!-- Vite inyecta el CSS compilado aquí automáticamente en el build -->
  <link rel="stylesheet" href="/input.css">

  <!-- Fuentes -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/assets/icons/icon-192.png">
</head>
<body>

  <!-- ══ CONTENIDO DE LA TIENDA ══ -->
  <!-- El HTML completo de index.html va aquí (se migrará en Fase 4) -->
  <!-- Por ahora es un placeholder funcional -->
  <div id="app">
    <p style="padding:40px;text-align:center;font-family:sans-serif">
      Cargando Limpieza RR...
    </p>
  </div>

  <!-- Vite gestiona este import automáticamente -->
  <script type="module" src="/js/app.js"></script>
</body>
</html>
EOF

# ── 11. Crear src/admin.html (panel admin) ───────────────────
cat > src/admin.html << 'EOF'
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Admin — Limpieza RR</title>

  <!-- Vite + Tailwind JIT (reemplaza el CDN de 325 KB) -->
  <link rel="stylesheet" href="/input.css">

  <!-- Fuentes -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">

  <!-- ══ CONTENIDO DEL ADMIN ══ -->
  <!-- El HTML completo de Admin.html va aquí (se migrará en Fase 4) -->
  <div id="admin-app">
    <p style="padding:40px;text-align:center;color:#14b8a6;font-family:sans-serif">
      Cargando panel admin...
    </p>
  </div>

  <script type="module" src="/js/admin.js"></script>
</body>
</html>
EOF

echo "   ✓ src/index.html"
echo "   ✓ src/admin.html"

# ── 12. Crear src/js/app.js (entry point tienda) ─────────────
cat > src/js/app.js << 'EOF'
/**
 * app.js — Entry point de la tienda
 *
 * Importa y coordina todos los módulos del frontend.
 * Este archivo reemplaza al app.js monolítico (62 KB).
 *
 * Cada responsabilidad vive en su propio módulo:
 *   api.js      → fetch de productos, pedidos, reseñas
 *   cart.js     → estado del carrito
 *   ui/toast.js → notificaciones
 *   helpers/    → format, validators
 */

import { fetchProductos, CONFIG } from './modules/api.js'
import { showToast } from './modules/ui/toast.js'
import { fmt } from './helpers/format.js'

// Estado global de la tienda
let products = []

// ── Inicializar la app ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🧴 Limpieza RR v2 — Iniciando...')

  try {
    // Cargar productos desde Google Sheets (o caché)
    products = await fetchProductos()
    console.log(`✅ ${products.length} productos cargados`)

    // TODO: Fase 3 — conectar módulos de UI
    // renderCarousel(products)
    // renderProducts(products)
    // initCart()
    // loadResenas()

    // Por ahora, confirmar que la configuración funciona
    showToast(`✅ ${products.length} productos listos`)

  } catch (err) {
    console.error('Error cargando productos:', err)
    showToast('⚠️ Error de conexión — revisa la consola')
  }
})
EOF

# ── 13. Crear src/js/admin.js (entry point admin) ────────────
cat > src/js/admin.js << 'EOF'
/**
 * admin.js — Entry point del panel de administración
 *
 * Este archivo reemplaza al admin_logic.js monolítico (69 KB).
 * Los módulos se importarán en la Fase 3.
 */

console.log('🔐 Limpieza RR Admin v2 — Iniciando...')

// TODO: Fase 3 — importar módulos admin
// import { initAuth }     from './modules/admin/auth.js'
// import { initTabs }     from './modules/admin/tabs.js'
// import { initPedidos }  from './modules/admin/pedidos.js'
// import { initAdmin }    from './modules/admin/inventario.js'
// import { initDashboard }from './modules/admin/dashboard.js'

// Por ahora: verificar que el setup funciona
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('admin-app')
  if (app) {
    app.innerHTML = `
      <div style="padding:40px;text-align:center;color:#14b8a6;font-family:sans-serif">
        <div style="font-size:2rem;margin-bottom:12px">🔐</div>
        <div style="font-size:1.1rem;font-weight:600">Admin Limpieza RR v2</div>
        <div style="font-size:.85rem;color:#64748b;margin-top:8px">
          Setup correcto — Fase 3 conectará los módulos
        </div>
      </div>
    `
  }
})
EOF

echo "   ✓ src/js/app.js"
echo "   ✓ src/js/admin.js"

# ── 14. Copiar manifest y service worker ─────────────────────
echo ""
echo "📱 Copiando archivos PWA a src/..."

# Si ya existen en la raíz, crear versiones en src/
cat > src/manifest.json << 'EOF'
{
  "name": "Limpieza RR",
  "short_name": "Limpieza RR",
  "description": "Productos de aseo premium para tu hogar. Pedidos por WhatsApp.",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#F0FDF9",
  "theme_color": "#0D9488",
  "orientation": "portrait",
  "lang": "es",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "categories": ["shopping", "lifestyle"]
}
EOF

echo "   ✓ src/manifest.json"

# ── 15. Crear README rápido ───────────────────────────────────
echo ""
echo "📄 Creando README.md..."
cat > README.md << 'EOF'
# 🧴 Limpieza RR v2

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
# → Abre http://localhost:3000 automáticamente

# 3. Build para producción
npm run build
# → Genera dist/ optimizado

# 4. Previsualizar build
npm run preview
```

## Estructura

```
src/
├── index.html          ← Tienda
├── admin.html          ← Panel admin
├── input.css           ← Entry point Tailwind
├── js/
│   ├── app.js          ← Entry point tienda
│   ├── admin.js        ← Entry point admin
│   ├── modules/        ← Módulos por responsabilidad
│   │   ├── api.js
│   │   ├── cart.js
│   │   ├── ui/toast.js
│   │   └── admin/
│   └── helpers/
│       ├── format.js
│       └── validators.js
├── css/
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   ├── animations.css
│   └── responsive.css
└── assets/icons/
```

## Configuración

En `src/js/modules/api.js`, cambia `APPS_SCRIPT_URL` por tu URL de Apps Script.

## Apps Script

Los archivos `.gs` viven en `apps-script/` — **no requieren cambios**.
EOF

echo "   ✓ README.md"

# ── Resumen final ────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║               ✅ Setup completado                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Archivos creados:                                   ║"
echo "║    package.json · vite.config.js · tailwind.config.js║"
echo "║    postcss.config.js · .gitignore · README.md        ║"
echo "║    src/index.html · src/admin.html · src/input.css   ║"
echo "║    src/css/ (5 archivos) · src/js/ (7 archivos)      ║"
echo "║                                                      ║"
echo "║  Próximos pasos:                                     ║"
echo "║    1. npm install                                    ║"
echo "║    2. npm run dev                                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
