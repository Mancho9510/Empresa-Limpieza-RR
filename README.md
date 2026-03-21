# 🧴 Limpieza RR — Tienda Web + Panel de Administración

> Plataforma completa de e-commerce para productos de aseo premium en Colombia. Los clientes navegan el catálogo, agregan al carrito y realizan pedidos por **WhatsApp**. Cada pedido se registra automáticamente en **Google Sheets** como base de datos, con panel de administración full para gestión de pedidos, inventario, clientes, proveedores, dashboard y rentabilidad.

[![Deploy con Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Apps Script](https://img.shields.io/badge/Backend-Google%20Apps%20Script-4285F4?logo=google)](https://script.google.com)
[![Vite 6](https://img.shields.io/badge/Build-Vite%206-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind 4](https://img.shields.io/badge/CSS-Tailwind%204-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Instalable-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

---

## 📋 Tabla de contenidos

- [Demo](#-demo)
- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Requisitos previos](#-requisitos-previos)
- [Setup inicial — Apps Script](#%EF%B8%8F-setup-inicial--apps-script)
- [Setup inicial — Proyecto web](#-setup-inicial--proyecto-web)
- [Deploy en Vercel (recomendado)](#-deploy-en-vercel-recomendado)
- [Estructura de Google Sheets](#-estructura-de-google-sheets)
- [Panel de administración](#%EF%B8%8F-panel-de-administración)
- [Google Analytics 4](#-google-analytics-4)
- [PWA — Instalar como app](#-pwa--instalar-como-app)
- [Personalización rápida](#-personalización-rápida)
- [Funciones de mantenimiento](#-funciones-de-mantenimiento-apps-script)
- [Compatibilidad](#-compatibilidad)

---

## 🌐 Demo

| Enlace | Descripción |
|---|---|
| `https://tu-dominio.vercel.app/` | Tienda pública |
| `https://tu-dominio.vercel.app/admin.html` | Panel de administración |

> Clave del panel admin: `LIMPIEZARR2025` (cámbiala en `src/js/admin/config.js`)

---

## ✨ Características

### 🛒 Tienda pública

| Función | Descripción |
|---|---|
| **Hero animado** | Estadísticas en tiempo real, botones CTA, carrusel de productos destacados |
| **Catálogo completo** | Grid con filtros por categoría generados dinámicamente desde Sheets |
| **Búsqueda en tiempo real** | Filtra por nombre, categoría y descripción con debounce |
| **Galería de imágenes** | Hasta 3 fotos por producto en el modal (drag y dots) |
| **Control de stock** | Badge rojo "Agotado" / amarillo "¡Solo X!" según columna `stock` en Sheets |
| **Carrito lateral** | Subtotal en tiempo real, ajuste de cantidades, eliminar ítems |
| **Cupones de descuento** | Validación en tiempo real contra hoja `Cupones` (% o valor fijo) |
| **Formulario de pedido** | 10 campos + medio de pago + 7 zonas de envío Bogotá |
| **Pedido por WhatsApp** | Genera mensaje formateado y redirige a WhatsApp |
| **Recibo digital** | Modal con resumen del pedido post-confirmación |
| **Historial de pedidos** | El cliente consulta sus pedidos por número de teléfono |
| **Rastreo de pedido** | Pasos visuales: Recibido → En preparación → En camino → Entregado |
| **Calificaciones** | Modal de 1–5 estrellas post-pedido, guarda en Sheets |
| **Reseñas públicas** | Carga reseñas ≥ 4 estrellas desde Sheets y las muestra en el hero |
| **PWA instalable** | Banner automático + funciona sin conexión con Service Worker |
| **Google Analytics 4** | Eventos: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `search` |

### 🖥️ Panel de administración

| Pestaña | Funciones principales |
|---|---|
| **📦 Pedidos** | Lista paginada (50/página), búsqueda server-side, filtros por estado/pago/fecha, actualizar estado en 1 clic, avisar al cliente por WhatsApp, exportar CSV |
| **🏷️ Inventario** | Tabla con imagen, edición inline de stock y costo, filtros por categoría y estado de stock, alertas de agotados |
| **👥 Clientes** | Segmentación VIP/Recurrente/Nuevo, últimos productos comprados, top productos por cliente, filtros por tipo y recencia |
| **🏭 Proveedores** | Portafolio de productos, relación con pedidos, estado activo/inactivo |
| **📊 Dashboard** | KPIs hoy/mes/total, ventas por semana (8 semanas), top 5 productos, top clientes, zonas y métodos de pago, alertas de stock |
| **💰 Rentabilidad** | **Edición inline de costo y % margen por producto**, ganancia/ud en tiempo real, calculadora de precio sugerido, vista previa masiva, top más/menos rentables |

---

## 🛠️ Stack tecnológico

| Tecnología | Uso |
|---|---|
| **Vite 6** | Bundler + servidor de desarrollo |
| **Tailwind CSS 4** | Estilos — tienda y panel admin |
| **Google Sheets** | Base de datos: Productos, Pedidos, Clientes, Cupones, Calificaciones |
| **Google Apps Script** | API REST gratuita — conecta la web con Sheets |
| **Google Analytics 4** | Tracking de eventos de comercio electrónico |
| **WhatsApp (wa.me)** | Canal de pedidos y notificaciones al cliente |
| **CallMeBot** | Notificaciones WhatsApp al administrador (opcional) |
| **Service Worker** | Cache offline, estrategia cache-first para assets |
| **Web App Manifest** | PWA instalable en Android e iOS |

---

## 📁 Estructura del proyecto

```
limpieza-rr/
│
├── src/                        ← Código fuente (Vite root)
│   ├── index.html              ← Tienda pública
│   ├── admin.html              ← Panel de administración
│   ├── tienda.css              ← Estilos de la tienda (@import tailwindcss)
│   ├── admin.css               ← Estilos del admin (@import tailwindcss)
│   │
│   └── js/
│       ├── app.js              ← Entry point tienda
│       ├── admin.js            ← Entry point admin
│       │
│       ├── modules/            ← Módulos ES6 de la tienda
│       │   ├── analytics.js    ← Google Analytics 4
│       │   ├── api.js          ← Llamadas al Apps Script
│       │   ├── cart.js         ← Lógica del carrito
│       │   ├── cart-ui.js      ← UI del carrito lateral
│       │   ├── products.js     ← Carga y caché de productos
│       │   ├── carousel.js     ← Carrusel del hero
│       │   ├── modal.js        ← Modal de producto
│       │   ├── order.js        ← Formulario de pedido y confirmación
│       │   ├── reviews.js      ← Reseñas públicas
│       │   ├── history.js      ← Historial y rastreo de pedidos
│       │   ├── recibo.js       ← Recibo digital post-pedido
│       │   ├── pwa.js          ← Instalación PWA
│       │   ├── coupon.js       ← Validación de cupones
│       │   └── ui/
│       │       ├── toast.js    ← Notificaciones toast
│       │       └── overlay.js  ← Overlay global
│       │
│       └── admin/              ← Módulos ES6 del panel admin
│           ├── config.js       ← URL Apps Script, clave admin, WhatsApp
│           ├── auth.js         ← Login/logout
│           ├── tabs.js         ← Navegación entre pestañas
│           ├── admin-api.js    ← Capa de acceso al backend
│           ├── helpers.js      ← Funciones compartidas (fmt, badges, etc.)
│           ├── admin-toast.js  ← Toasts del panel
│           ├── pedidos.js      ← Gestión de pedidos
│           ├── inventario.js   ← Gestión de inventario
│           ├── clientes.js     ← Gestión de clientes
│           ├── proveedores.js  ← Gestión de proveedores
│           ├── dashboard.js    ← Dashboard de métricas
│           └── rentabilidad.js ← Análisis de rentabilidad con edición inline
│
├── apps-script/                ← Backend Google Apps Script
│   ├── LIMPIEZARR.gs           ← doGet, doPost, endpoints principales
│   ├── LIMPIEZARR_Setup.gs     ← Setup, helpers, populateProductos
│   ├── LIMPIEZARR_Admin.gs     ← Inicialización de hojas, backups
│   ├── LIMPIEZARR_Clientes.gs  ← Endpoints de clientes
│   ├── LIMPIEZARR_Dashboard.gs ← Dashboard, cupones, calificaciones, email
│   ├── LIMPIEZARR_Formato.gs   ← Formato de tablas, triggers
│   └── LIMPIEZARR_Proveedores.gs ← Endpoints de proveedores
│
├── public/                     ← Assets estáticos (copiados tal cual al dist/)
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── sw.js                       ← Service Worker (debe estar en raíz del dominio)
├── manifest.json               ← Web App Manifest
├── vite.config.js
├── package.json
└── README.md
```

---

## 📋 Requisitos previos

- **Node.js 18+** y npm
- Cuenta de **Google** (para Google Sheets + Apps Script)
- Cuenta de **Vercel** (gratis) para el deploy
- Cuenta de **GitHub** para el repositorio

---

## ⚙️ Setup inicial — Apps Script

### Paso 1 — Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea un nuevo spreadsheet
2. Nómbralo `Limpieza RR`
3. Ve a **Extensiones → Apps Script**

### Paso 2 — Crear los archivos del script

En el editor de Apps Script, crea **7 archivos** con estos nombres exactos y pega el contenido de la carpeta `apps-script/`:

| Archivo | Descripción |
|---|---|
| `LIMPIEZARR` | Endpoints principales (`doGet`, `doPost`) |
| `LIMPIEZARR_Setup` | Configuración inicial y helpers |
| `LIMPIEZARR_Admin` | Inicialización de hojas y backups |
| `LIMPIEZARR_Clientes` | Gestión de clientes |
| `LIMPIEZARR_Dashboard` | Dashboard, cupones y calificaciones |
| `LIMPIEZARR_Formato` | Formato de tablas y triggers |
| `LIMPIEZARR_Proveedores` | Gestión de proveedores |

### Paso 3 — Ejecutar setup (en orden)

En el editor de Apps Script, ejecuta estas funciones **una sola vez** en este orden:

```
1. configuracionInicial()    → Crea todas las hojas (Productos, Pedidos, Clientes...)
2. instalarDisparador()      → Activa auto-formato al editar el Sheet
3. instalarTriggerHorario()  → Refresca el dashboard cada hora automáticamente
4. limpiarStock()            → Deja el stock en blanco (sin control de inventario)
```

> ⚠️ **IMPORTANTE**: `configuracionInicial()` NO borra datos si la hoja ya tiene contenido.

### Paso 4 — Publicar como Web App

1. Click en **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo (tu cuenta Google)**
4. Acceso: **Cualquier usuario (incluso anónimos)**
5. Click en **Implementar** y copia la URL generada

La URL tiene este formato:
```
https://script.google.com/macros/s/AKfycb.../exec
```

> **Cada vez que modifiques el código del Apps Script**, debes republicar:
> `Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar`
> La URL no cambia. Los datos no se pierden.

### Paso 5 — Activar notificaciones WhatsApp (opcional)

1. Agrega **+34 623 78 64 49** a tus contactos de WhatsApp
2. Envíale exactamente: `I allow callmebot to send me messages`
3. Recibirás tu API key (puede tardar hasta 2 minutos)
4. En `LIMPIEZARR.gs`, configura:

```javascript
var CONFIG_WA = {
  NUMERO:  "57XXXXXXXXXX",  // Tu número con código de país, sin +
  API_KEY: "TU_API_KEY",    // Solo el número de key, ej: "4942289"
  ACTIVO:  true,
};
```

---

## 🚀 Setup inicial — Proyecto web

### Clonar e instalar

```bash
git clone https://github.com/Mancho9510/Empresa-Limpieza-RR.git
cd Empresa-Limpieza-RR
npm install
```

### Configurar las variables

**1. URL del Apps Script** — editar `src/js/admin/config.js`:

```javascript
export const APPS_URL  = 'https://script.google.com/macros/s/TU_ID/exec';
export const ADMIN_KEY = 'LIMPIEZARR2025';  // Cambia esto
export const WA_NUMBER = '573503443140';    // Tu número de WhatsApp
```

**2. URL del Apps Script para la tienda** — editar `src/js/modules/api.js`:

```javascript
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID/exec';
```

**3. ID de Google Analytics** — editar `src/js/modules/analytics.js`:

```javascript
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';  // Tu ID de GA4
```

### Desarrollo local

```bash
npm run dev
# Tienda:  http://localhost:3000/
# Admin:   http://localhost:3000/admin.html
```

> ⚠️ El panel admin NO funciona con `file://`. Siempre usa el servidor de Vite o un dominio HTTPS.

### Build de producción

```bash
npm run build
# Genera la carpeta dist/ lista para deploy
```

---

## 🚀 Deploy en Vercel (recomendado)

Vercel es **gratuito** para proyectos personales, más rápido que GitHub Pages, y compatible nativamente con Vite.

### Opción A — Deploy desde GitHub (recomendado)

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub
2. Click en **Add New Project**
3. Importa el repositorio `Mancho9510/Empresa-Limpieza-RR`
4. Configura el proyecto:

| Setting | Valor |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `.` (raíz del repositorio) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

5. Click en **Deploy**
6. En ~2 minutos tendrás tu URL: `https://empresa-limpieza-rr.vercel.app`

> Cada `git push` a `main` despliega automáticamente — sin pasos adicionales.

### Opción B — Deploy manual con Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Por qué Vercel y no GitHub Pages

| | GitHub Pages | Vercel |
|---|---|---|
| **Costo** | Gratis | Gratis |
| **Vite/Build** | ❌ Solo archivos estáticos | ✅ Detecta Vite automáticamente |
| **Deploy automático** | ⚠️ Requiere configurar Actions | ✅ Al hacer push |
| **HTTPS** | ✅ | ✅ |
| **Dominio personalizado** | ✅ | ✅ |
| **Velocidad de deploy** | ~3 min | ~1 min |
| **Por qué fallaba tu repo** | No hay carpeta `dist/` ni `gh-pages` configurado | — |

> **El problema con tu repositorio actual**: GitHub Pages solo sirve archivos estáticos directamente. Como el proyecto usa Vite (requiere build), GitHub Pages muestra únicamente el `README.md` porque no encuentra un `index.html` en la raíz. Vercel resuelve esto automáticamente.

### Si prefieres mantener GitHub Pages

Agrega este archivo en tu repositorio: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main, version_pruebas_betas]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

Luego en tu repo: **Settings → Pages → Source: GitHub Actions**.

---

## 📊 Estructura de Google Sheets

### Hoja `Productos` — 14 columnas

```
id | nombre | tamano | precio | costo | ganancia_pct | categoria | destacado | emoji | descripcion | imagen | imagen2 | imagen3 | stock
```

- `destacado`: `TRUE` → aparece en el carrusel del hero
- `imagen/imagen2/imagen3`: URL de Google Drive o cualquier URL directa
- `stock`: vacío = sin control · número = unidades · `0` = agotado
- `costo` y `ganancia_pct`: se usan en la pestaña Rentabilidad del admin

### Hoja `Pedidos` — 20 columnas

```
fecha | nombre | telefono | ciudad | departamento | barrio | direccion |
casa | conjunto | nota | cupon | descuento | pago | zona_envio |
costo_envio | subtotal | total | estado_pago | estado_envio | productos
```

- `estado_pago`: `PENDIENTE` · `PAGADO` · `CONTRA ENTREGA`
- `estado_envio`: `Recibido` · `En preparación` · `En camino` · `Entregado`

### Hoja `Clientes` — 10 columnas

```
primera_compra | ultima_compra | nombre | telefono | ciudad |
barrio | direccion | total_pedidos | total_gastado | tipo
```

- `tipo` se actualiza automáticamente con cada pedido:
  - `Nuevo` → 1 pedido
  - `Recurrente` → 2+ pedidos o $150.000+ gastados
  - `VIP` → 10+ pedidos o $500.000+ gastados

### Hoja `Cupones` — 8 columnas

```
codigo | descripcion | tipo | valor | usos_maximos | usos_actuales | vencimiento | activo
```

- `tipo`: `pct` = porcentaje · `fixed` = valor fijo en pesos
- Ejemplo: `pct` con valor `10` → descuento del 10%

### Hoja `Calificaciones` — 5 columnas

```
fecha | nombre | telefono | estrellas | comentario
```

### Hoja `Dashboard`

Se regenera automáticamente con cada pedido y cada hora (trigger). Incluye gráfica de barras de ventas semanales generada con la Charts API de Google.

---

## 🖥️ Panel de administración

**URL**: `https://tu-dominio.vercel.app/admin.html`
**Clave**: `LIMPIEZARR2025` (configurable en `src/js/admin/config.js`)

> ⚠️ El panel NO funciona en local con `file://`. Requiere HTTPS.

### Pestaña 💰 Rentabilidad — Edición inline

La tabla de productos permite editar costo y margen directamente:

1. **Campo Costo** (borde amarillo): ingresa el precio al que compraste el producto
2. **Campo Margen %** (borde teal): ingresa el margen de ganancia deseado
3. **Botón 💾 Guardar**: guarda ambos valores y calcula el precio de venta sugerido

Si ingresas **solo el costo** → recalcula la ganancia con el precio de venta existente.

Si ingresas **costo + margen** → calcula y guarda el precio de venta sugerido (`costo × (1 + margen/100)`).

Los cambios se sincronizan automáticamente con la pestaña **Inventario** en tiempo real.

---

## 📈 Google Analytics 4

El proyecto incluye tracking completo de eventos de e-commerce:

| Evento GA4 | Cuándo se dispara |
|---|---|
| `view_item` | Al abrir el modal de un producto |
| `add_to_cart` | Al agregar un producto al carrito |
| `begin_checkout` | Al abrir el formulario de pedido |
| `purchase` | Al confirmar el pedido (después del `window.open` de WhatsApp) |
| `search` | Al usar la búsqueda (debounce 800ms, mínimo 2 caracteres) |
| `select_promotion` | Al aplicar un cupón de descuento |

### Activar GA4

1. Ve a [analytics.google.com](https://analytics.google.com) → Crear cuenta
2. Crear propiedad → Flujo de datos web → Obtener ID (`G-XXXXXXXXXX`)
3. Editar `src/js/modules/analytics.js`:
   ```javascript
   const GA_MEASUREMENT_ID = 'G-TUIDDAQUI';
   ```

> En desarrollo (`localhost`) los eventos NO se envían a GA4.

---

## 📱 PWA — Instalar como app

El proyecto es una PWA completa con Service Worker v2 que cachea:

- `index.html`, `admin.html`, CSS, JS, `manifest.json`
- Google Fonts (cache persistente)
- Imágenes de productos desde Google Drive (cache con actualización en background)

**Estrategias de cache:**

| Recurso | Estrategia |
|---|---|
| Assets locales | Cache First + actualización en background |
| Apps Script | Network Only (datos siempre frescos) |
| Google Fonts / Drive | Cache First |

### Generar íconos PWA

1. Abre `tools/GenerateIcons.html` en el navegador
2. Click en **"Descargar ambos íconos"**
3. Guarda `icon-192.png` e `icon-512.png` en `public/icons/`

---

## 🧩 Personalización rápida

| Qué cambiar | Archivo | Variable |
|---|---|---|
| URL del Apps Script (admin) | `src/js/admin/config.js` | `APPS_URL` |
| URL del Apps Script (tienda) | `src/js/modules/api.js` | `APPS_SCRIPT_URL` |
| Clave del panel admin | `src/js/admin/config.js` | `ADMIN_KEY` |
| Número de WhatsApp | `src/js/admin/config.js` | `WA_NUMBER` |
| ID de Google Analytics | `src/js/modules/analytics.js` | `GA_MEASUREMENT_ID` |
| Número de pagos (Nequi/etc.) | `src/js/modules/order.js` | `PAY_NUMBER` |
| Nombre del titular de pagos | `src/js/modules/order.js` | `PAY_HOLDER` |
| Velocidad del carrusel | `src/js/modules/carousel.js` | `AUTOPLAY_MS` |
| Colores principales | `src/tienda.css` | Variables CSS `:root` |
| Umbral de stock bajo | `apps-script/LIMPIEZARR.gs` | `descontarStock()` → `<= 5` |
| Clasificación VIP | `apps-script/LIMPIEZARR.gs` | `clasificarCliente()` |
| Pedidos por página en admin | `src/js/admin/pedidos.js` | `POR_PAGINA` |

---

## 🔧 Funciones de mantenimiento (Apps Script)

Ejecutar desde el editor de Apps Script en **Extensiones → Apps Script**:

### Setup (una sola vez)

```
configuracionInicial()     → Crea todas las hojas sin borrar datos existentes
instalarDisparador()       → Auto-formato al editar (ejecutar una vez)
instalarTriggerHorario()   → Refresca dashboard cada hora (ejecutar una vez)
```

### Reparaciones

```
repararEsquemaPedidosV2()  → Migra hoja Pedidos a 20 columnas sin perder datos
limpiarStock()             → Deja todo el stock en blanco (sin control)
limpiarGananciaPct()       → Normaliza celdas de ganancia con formato incorrecto
verificarStockCompleto()   → Envía email con todos los productos en alerta
calcularGanancias()        → Recalcula ganancia_pct para todos los productos
```

### Backups

```
hacerBackup()              → Crea copias BKP de todas las hojas con fecha
limpiarBackups()           → Elimina todas las hojas BKP acumuladas
```

### ⚠️ Funciones peligrosas (usar con cuidado)

```
configuracionInicial()     → Si la hoja está vacía, la crea. Si tiene datos, solo valida el esquema.
resetearProductos()        → FUERZA la recreación del catálogo — borra el contenido actual de Productos
```

---

## 🚚 Zonas de envío — Bogotá

| Zona | Barrios | Costo |
|---|---|---|
| Centro | Kennedy, Bosa, Puente Aranda | $5.000 |
| Norte | Usaquén, Chapinero, Suba | $7.000 |
| Sur | Usme, Ciudad Bolívar, Tunjuelito | $8.000 |
| Occidente | Fontibón, Engativá, Barrios Unidos | $10.000 |
| Oriente | San Cristóbal, Rafael Uribe, Antonio Nariño | $12.000 |
| Noroccidente | Suba lejano, La Conejera | $15.000 |
| Periférica | Límites distritales | $20.000 |
| Sin zona | Mi barrio no aparece | Precio a convenir |

---

## ✅ Compatibilidad

| Navegador | Soporte |
|---|---|
| Chrome 80+ | ✅ Completo (recomendado) |
| Firefox 90+ | ✅ Completo |
| Safari 14+ / iOS | ✅ Completo |
| Edge 80+ | ✅ Completo |
| Samsung Internet | ✅ Completo |

---

## 📞 Datos del negocio

| Campo | Valor |
|---|---|
| Nombre | Limpieza RR |
| WhatsApp / Teléfono | +57 350 344 3140 |
| Número de pagos | 320 334 6819 |
| País | Colombia 🇨🇴 |
| Ciudad | Bogotá y alrededores |
| Medios de pago | Transferencia, Nequi, Breb, Daviplata, Contra entrega |

---

## 📄 Licencia

Proyecto privado de **Limpieza RR**. Todos los derechos reservados © 2026.