# 🧴 Limpieza RR — Tienda Web + Panel de Administración

Plataforma completa de catálogo y ventas para **Limpieza RR**, empresa colombiana de productos de aseo premium. Los clientes navegan el catálogo, agregan productos al carrito y realizan pedidos directamente por **WhatsApp**. Cada pedido queda registrado automáticamente en **Google Sheets**, con notificaciones instantáneas por email y WhatsApp, control de inventario automatizado y panel de administración desde cualquier dispositivo.

---

## 📁 Estructura del proyecto

```
limpieza-rr/
├── index.html              # Entry point tienda web
├── Admin.html              # Entry point panel admin
├── manifest.json           # Web manifest PWA
├── Sw.js                   # Service Worker PWA (debe quedarse en raíz)
├── assets/
│   ├── css/
│   │   └── styles.css      # Estilos de la tienda
│   └── js/
│       └── app.js          # Lógica del storefront
├── admin/
│   ├── api.js              # Capa de acceso al Apps Script
│   ├── admin.logic.js      # Estado y controladores del admin
│   ├── admin.ui.js         # Renderizadores del admin
│   └── legacy/
│       └── admin.js        # Versión anterior / demo
├── apps-script/
│   ├── LIMPIEZARR.gs
│   ├── LIMPIEZARR_Setup.gs
│   ├── LIMPIEZARR_Admin.gs
│   ├── LIMPIEZARR_Clientes.gs
│   ├── LIMPIEZARR_Proveedores.gs
│   ├── LIMPIEZARR_Formato.gs
│   └── LIMPIEZARR_Dashboard.gs
├── tools/
│   └── GenerateIcons.html  # Generador de íconos PWA
└── README.md
```

> Los entrypoints públicos siguen en raíz para no romper despliegues actuales. La lógica y los scripts de soporte ya viven en carpetas separadas.

---

## ✨ Funcionalidades completas

### 🛒 Tienda (`index.html` + `assets/js/app.js`)

| Función | Descripción |
|---|---|
| **Hero** | Sección de bienvenida con estadísticas y botones CTA |
| **Carrusel de destacados** | Productos con `destacado=TRUE` rotan automáticamente cada 4,2 segundos |
| **Catálogo completo** | Grid con filtros por categoría (8 categorías) |
| **Barra de búsqueda** | Filtra en tiempo real por nombre, categoría y descripción |
| **Galería de imágenes** | Hasta 3 fotos por producto con visor en el modal (imagen, imagen2, imagen3) |
| **Control de stock** | Badge "Agotado" en rojo / "¡Solo X!" en amarillo según columna `stock` |
| **Modal de producto** | Galería, descripción completa, precio y selector de cantidad |
| **Carrito lateral** | Subtotal en tiempo real, ajuste de cantidades, eliminar ítems |
| **Cupones de descuento** | Campo en el carrito — valida en tiempo real contra hoja `Cupones` |
| **Formulario de pedido** | Nombre, teléfono, ciudad, dpto., barrio, dirección, pago, zona envío |
| **7 Zonas de envío Bogotá** | Precios $5.000–$20.000 + "Precio a convenir" |
| **Pedido por WhatsApp** | Genera y envía mensaje completo formateado al número del negocio |
| **Historial de pedidos** | El cliente consulta todos sus pedidos ingresando su teléfono |
| **Rastrear pedido** | El cliente ve el estado de envío con pasos visuales (Recibido → Entregado) |
| **Calificación post-pedido** | Modal de 1–5 estrellas + comentario, 2 segundos después de confirmar |
| **PWA instalable** | Banner automático de instalación + ícono en pantalla de inicio |
| **Caché offline** | Productos guardados 30 min en localStorage — carga instantánea en visitas repetidas |
| **Diseño responsivo** | Móvil, tablet y escritorio — compatible con todos los navegadores modernos |
| **Animaciones** | Fade-in con IntersectionObserver, carrusel animado, skeletons de carga |

### 🖥️ Panel Admin (`Admin.html` + `admin/`) — Tailwind CSS, mobile-first

**URL:** `https://tuusuario.github.io/repo/admin.html`  
**Clave de acceso:** `LIMPIEZARR2025`

> ⚠️ El panel **NO funciona** abriendo el archivo desde disco (`file://`). Siempre debe estar desplegado en HTTPS (GitHub Pages o Netlify).

#### Pestaña 📦 Pedidos

| Función | Descripción |
|---|---|
| **Lista paginada** | 50 pedidos por página, navegación ← → con contador total |
| **Búsqueda server-side** | Búsqueda con debounce 500ms — consulta directamente en Sheets |
| **Filtros combinados** | Por estado de pago, estado de envío y rango de fechas |
| **Badge NUEVO** | Pedidos de las últimas 24 horas marcados con badge verde pulsante |
| **Cards expandibles** | Click para ver dirección, productos, total y acciones |
| **Actualizar estado** | Cambia estado de pago y envío — guarda directo en Sheets con un clic |
| **Avisar al cliente** | Botón WhatsApp con mensaje pre-escrito según el estado seleccionado |
| **Exportar CSV** | Descarga los pedidos del filtro activo en formato compatible con Excel |
| **5 KPIs en tiempo real** | Total, pendientes, en camino, entregados, total recaudado |

#### Pestaña 🏷️ Inventario

| Función | Descripción |
|---|---|
| **Tabla responsiva** | Imagen real del producto, nombre, tamaño, categoría, precio y stock |
| **Stock con colores** | 🔴 Agotado / 🟡 Bajo / 🟢 Normal — visible de un vistazo |
| **Editar stock inline** | Campo numérico + botón Guardar en cada fila — actualiza Sheets al instante |
| **Banner de alertas** | Aparece automáticamente si hay productos agotados o con stock bajo |
| **Filtros** | Búsqueda por nombre, filtro por categoría y por estado de stock |
| **4 KPIs** | Total productos, agotados, stock bajo, sin control |

#### Pestaña 📊 Dashboard

| Sección | Contenido |
|---|---|
| **KPIs hoy / mes** | Pedidos y ventas del día y del mes en curso |
| **KPIs generales** | Total pedidos, ticket promedio, ventas totales, pendientes, clientes, VIP |
| **Calificación** | Promedio en estrellas + número de reseñas |
| **Ventas por semana** | Barras horizontales de las últimas 8 semanas con valores en pesos |
| **Top 5 productos** | Con barras de progreso y medallas 🥇🥈🥉 |
| **Clientes frecuentes** | Ranking con número de pedidos |
| **Zonas de envío** | Con porcentaje de participación |
| **Métodos de pago** | Con íconos por plataforma |
| **Estado de pedidos** | Barras de Pendientes / Pagados / Entregados con % |
| **Alertas de inventario** | Solo visible si hay productos agotados o con stock bajo |
| **Caché inteligente** | Primera carga 4–7 seg · siguientes 5 min < 1 seg |
| **Forzar refresco** | Botón para invalidar caché y recalcular en tiempo real |

### 📊 Google Sheets — Hoja Resumen (Dashboard automático)

La hoja `Resumen` se regenera automáticamente al recibir cada pedido y cada hora (trigger). Incluye:

- KPIs hoy / mes / total con formato visual
- **Gráfica de barras** de ventas por semana (Charts API de Google)
- Top 5 productos más vendidos con % de participación visual
- Top 5 clientes frecuentes con valor acumulado desde hoja Clientes
- Ranking de zonas de envío y métodos de pago con porcentajes
- Estado de pedidos (pendientes / pagados / entregados) con colores
- Calificación promedio con estrellas visuales (☆★)
- Alertas de inventario agotado y stock bajo resaltadas en rojo/amarillo

### 🔔 Notificaciones automáticas

| Tipo | Cuándo se envía | Requisito |
|---|---|---|
| **Email (pedido)** | Al recibir cada pedido nuevo | Automático — usa la cuenta Google del script |
| **WhatsApp (pedido)** | Al recibir cada pedido nuevo | API key gratuita de CallMeBot |
| **Email (stock)** | Cuando un producto llega a 0 o ≤ 5 unidades | Automático |

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 / CSS3 / JS ES6+ | Tienda web completa |
| Tailwind CSS (CDN) | Estilos del panel admin — mobile-first |
| Google Fonts (Syne + Outfit) | Tipografías |
| Google Sheets | Base de datos: productos, pedidos, clientes, cupones, calificaciones |
| Google Apps Script | API REST gratuita — conecta la web con Sheets |
| Google Drive | Almacenamiento de imágenes de productos |
| WhatsApp API (wa.me) | Envío de pedidos y notificaciones al cliente |
| CallMeBot API (gratuita) | Notificaciones WhatsApp al dueño del negocio |
| Service Worker | PWA — caché offline de todos los assets |
| Web App Manifest | PWA — instalable como app en Android e iOS |
| localStorage | Caché de productos (30 min de expiración) |
| CacheService (Apps Script) | Caché del dashboard admin (5 min, invalidación automática) |

---

## ⚙️ Estructura de Google Sheets

### `Productos` — 12 columnas

| id | nombre | tamano | precio | categoria | destacado | emoji | descripcion | imagen | imagen2 | imagen3 | stock |
|----|--------|--------|--------|-----------|-----------|-------|-------------|--------|---------|---------|-------|

- `destacado`: `TRUE` → aparece en el carrusel del hero
- `imagen` / `imagen2` / `imagen3`: URL de Google Drive o URL directa (jpg, png, webp)
- `stock`: vacío = sin control · número = unidades · `0` = agotado

### `Pedidos` — 20 columnas

```
fecha | nombre | telefono | ciudad | departamento | barrio | direccion |
casa | conjunto | nota | cupon | descuento | pago | zona_envio |
costo_envio | subtotal | total | estado_pago | estado_envio | productos
```

- `estado_pago`: `PENDIENTE` · `PAGADO` · `CONTRA ENTREGA`
- `estado_envio`: `Recibido` · `En preparación` · `En camino` · `Entregado`
- `cupon` y `descuento`: se rellenan automáticamente si el cliente usó cupón

### `Clientes` — 10 columnas

```
primera_compra | ultima_compra | nombre | telefono | ciudad |
barrio | direccion | total_pedidos | total_gastado | tipo
```

- `tipo` se actualiza automáticamente: `Nuevo` · `Recurrente` · `VIP`

### `Cupones` — 8 columnas

```
codigo | descripcion | tipo | valor | usos_maximos | usos_actuales | vencimiento | activo
```

- `tipo`: `pct` = porcentaje · `fixed` = valor fijo en pesos
- Ejemplo: `pct` con valor `10` = 10% de descuento. `fixed` con valor `5000` = −$5.000

### `Calificaciones` — 5 columnas

```
fecha | nombre | telefono | estrellas | comentario
```

### `Resumen` — Dashboard automático (no editar manualmente)

---

## 🚀 Setup inicial — Apps Script

### Paso 1 — Crear los 5 archivos

En tu Google Sheet: **Extensiones → Apps Script**. Crea 5 archivos con estos nombres exactos:

| Archivo | Contenido |
|---|---|
| `LIMPIEZARR` | `doGet`, `doPost`, lógica de pedidos, endpoints admin |
| `LIMPIEZARR_Setup` | `populateProductos` — 44 productos con sus categorías |
| `LIMPIEZARR_Admin` | Inicializar hojas, backups, esquema, reparaciones |
| `LIMPIEZARR_Formato` | Auto-formato de tablas, disparador `onEdit` |
| `LIMPIEZARR_Dashboard` | Dashboard Resumen, cupones, email, calificaciones |

### Paso 2 — Ejecutar setup en orden

```
1. configuracionInicial()    → Crea hojas Productos, Pedidos, Clientes
2. setupCompleto()           → Crea Cupones + genera hoja Resumen inicial
3. instalarDisparador()      → Auto-formato en cada edición (ejecutar una vez)
4. limpiarStock()            → Limpia columna stock (ningún producto queda agotado)
5. instalarTriggerHorario()  → Refresca dashboard automáticamente cada hora
```

### Paso 3 — Publicar como Web App

1. Click en **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo**
4. Acceso: **Cualquier usuario**
5. Copiar la URL generada — tiene esta forma:  
   `https://script.google.com/macros/s/AK.../exec`

### Paso 4 — Pegar la URL en los archivos web

En `assets/js/app.js` (bloque `CONFIG` al inicio):
```javascript
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/TU_ID/exec",
  WA_NUMBER:       "573503443140",
  AUTOPLAY_MS:     4200,
  PAY_NUMBER:      "3203346819",
  PAY_HOLDER:      "Limpieza RR",
};
```

En `admin/api.js`:
```javascript
const ADMIN_CONFIG = {
  APPS_URL: "https://script.google.com/macros/s/TU_ID/exec",
  ADMIN_KEY: "LIMPIEZARR2025"
};
```

### Paso 5 — Republicar tras cualquier cambio en `.gs`

```
Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar
```

> La URL no cambia. Los datos no se pierden.

---

## 🔔 Activar notificaciones WhatsApp (CallMeBot — gratuito)

1. Agrega **+34 623 78 64 49** a tus contactos de WhatsApp
2. Envíale exactamente este mensaje:
   ```
   I allow callmebot to send me messages
   ```
3. Recibirás tu API key en respuesta (máximo 2 minutos)
4. Si no responde, intenta de nuevo después de 24 horas
5. Edita el bloque `CONFIG_WA` en `LIMPIEZARR.gs`:

```javascript
var CONFIG_WA = {
  NUMERO:  "573503443140",   // Tu número con código de país, sin +
  API_KEY: "TU_API_KEY",     // La key que recibiste por WhatsApp
  ACTIVO:  true,             // Cambiar a true para activar
};
```

> ⚠️ El número de CallMeBot cambia ocasionalmente. Si deja de funcionar, verifica el número actualizado en **callmebot.com**

---

## 🖼️ Generar íconos PWA

1. Abre `generate_icons.html` en el navegador (doble click)
2. Verás el preview del ícono (gota de agua con "RR")
3. Presiona **"Descargar ambos íconos"**
4. Crea la carpeta `icons/` en tu repositorio
5. Sube `icon-192.png` y `icon-512.png` a esa carpeta
6. Los usuarios de Chrome y Edge verán el banner de instalación automáticamente

---

## 🖼️ Imágenes de productos desde Google Drive

1. Sube la foto a Google Drive
2. Click derecho → **Obtener enlace** → cambia a **"Cualquier persona con el enlace"**
3. Copia el enlace y pégalo en la columna `imagen`, `imagen2` o `imagen3` del Sheet
4. El sistema convierte automáticamente el link al formato de imagen directa

**Formatos aceptados:**
- `https://drive.google.com/file/d/FILE_ID/view` → conversión automática
- `https://drive.google.com/open?id=FILE_ID` → conversión automática
- Cualquier URL directa de imagen (jpg, png, webp)

---

## 📦 Control de inventario

### Cómo funciona la columna `stock`

| Valor en celda | Qué ve el cliente | Color en Sheets |
|---|---|---|
| *(vacía)* | Producto normal, sin límite | Blanco |
| `50` o más | Disponible normalmente | 🟢 Verde |
| `1` a `5` | Badge amarillo **"¡Solo X!"** | 🟡 Amarillo |
| `0` | Badge rojo **"Agotado"** — no se puede agregar al carrito | 🔴 Rojo |

### Automatizaciones de stock

- Al recibir un pedido → el stock se descuenta automáticamente por producto
- Si algún producto queda en 0 o ≤ 5 → email de alerta automático
- La celda en Sheets se colorea automáticamente (rojo / amarillo / verde)
- Desde el admin → pestaña Inventario → editar cualquier stock en tiempo real

### Función de reporte manual

```
verificarStockCompleto()   → envía email con todos los productos en alerta
```

---

## 🏷️ Cupones de descuento

Administrar directamente desde la hoja `Cupones` en Sheets:

| codigo | descripcion | tipo | valor | usos_maximos | usos_actuales | vencimiento | activo |
|--------|-------------|------|-------|--------------|---------------|-------------|--------|
| BIENVENIDO | 10% bienvenida | pct | 10 | — | 0 | — | TRUE |
| PROMO5K | Descuento $5.000 | fixed | 5000 | 100 | 0 | — | TRUE |
| VIP20 | 20% clientes VIP | pct | 20 | 50 | 0 | — | TRUE |

- `tipo = pct` → porcentaje (valor `10` = 10% de descuento)
- `tipo = fixed` → valor fijo en pesos (valor `5000` = −$5.000)
- `vencimiento` → dejar vacío para sin vencimiento
- `usos_maximos` → dejar vacío para usos ilimitados
- El campo `usos_actuales` se incrementa automáticamente al usarse

---

## 🚚 Zonas de envío — Bogotá

| Zona | Barrios incluidos | Costo |
|---|---|---|
| Centro | Kennedy, Bosa, Puente Aranda | $ 5.000 |
| Norte | Usaquén, Chapinero, Suba | $ 7.000 |
| Sur | Usme, Ciudad Bolívar, Tunjuelito | $ 8.000 |
| Occidente | Fontibón, Engativá, Barrios Unidos | $ 10.000 |
| Oriente | San Cristóbal, Rafael Uribe, Antonio Nariño | $ 12.000 |
| Noroccidente | Suba lejano, La Conejera | $ 15.000 |
| Periférica | Límites distritales | $ 20.000 |
| Sin zona | Mi barrio no aparece | Precio a convenir |

---

## 📋 Formulario de pedido — campos completos

| Campo | Requerido | Descripción |
|---|---|---|
| Nombre completo | ✅ | Nombre del cliente |
| Teléfono / WhatsApp | ✅ | Clave única para historial y deduplicación en Clientes |
| Ciudad | ✅ | Ciudad de entrega |
| Departamento | ✅ | Departamento colombiano |
| Barrio | ✅ | Barrio de entrega |
| Dirección | ✅ | Calle, número, etc. |
| Casa / Apartamento | No | Número de apto, piso, interior |
| Nombre del conjunto | No | Si aplica |
| Nota adicional | No | Instrucciones especiales para el domiciliario |
| Cupón de descuento | No | Código — se valida en tiempo real |
| Medio de pago | ✅ | Transferencia / Nequi / Breb / Daviplata / Contra entrega |
| Zona de envío | ✅ | Selección de zona de Bogotá con precio |

---

## 🛡️ Funciones de mantenimiento en Apps Script

### ⚠️ Funciones peligrosas — usar con extremo cuidado

```
configuracionInicial()     → DESTRUYE y recrea todas las hojas — solo la primera vez
populateProductos()        → Solo actúa si la hoja Productos está vacía
resetearProductos()        → FUERZA la recreación de 44 productos — borra contenido actual
```

### 🔒 Antes de cualquier cambio importante

```
hacerBackup()              → Crea copias BKP de todas las hojas con fecha
```

### 🔧 Reparaciones

```
repararEsquemaPedidosV2()  → Lleva la hoja Pedidos a 20 columnas sin borrar datos
repararColumnasPedidos()   → Agrega columna telefono si falta (sin borrar datos)
verificarEstructura()      → Diagnóstica columnas de todas las hojas — solo lectura
limpiarStock()             → Deja todas las celdas de stock en blanco (sin control)
verificarStockCompleto()   → Envía email con todos los productos en alerta de stock
```

### ⚙️ Mantenimiento periódico

```
formatearTodo()             → Aplica formato visual a Productos, Pedidos y Clientes
instalarDisparador()        → Activa auto-formato en cada edición (ejecutar una vez)
instalarTriggerHorario()    → Invalida caché del dashboard cada hora (ejecutar una vez)
desinstalarTriggerHorario() → Elimina el trigger horario
refrescarDashboard()        → Actualiza hoja Resumen manualmente en cualquier momento
limpiarBackups()            → Elimina todas las hojas BKP acumuladas
setupCompleto()             → Crea Cupones + genera Dashboard (parte del setup inicial)
```

---

## 🧩 Personalización rápida

| Qué cambiar | Archivo | Cómo |
|---|---|---|
| Número de WhatsApp del negocio | `assets/js/app.js` | `CONFIG.WA_NUMBER` |
| URL del Apps Script | `assets/js/app.js` y `admin/api.js` | `CONFIG.APPS_SCRIPT_URL` / `ADMIN_CONFIG.APPS_URL` |
| Clave del panel admin | `admin/api.js` y `apps-script/LIMPIEZARR.gs` | `ADMIN_CONFIG.ADMIN_KEY` / `"LIMPIEZARR2025"` |
| Número WhatsApp notificaciones | `apps-script/LIMPIEZARR.gs` | `CONFIG_WA.NUMERO` |
| Velocidad del carrusel | `assets/js/app.js` | `CONFIG.AUTOPLAY_MS` (milisegundos) |
| Colores principales del sitio | `assets/css/styles.css` | Bloque `:root` (variables CSS) |
| Logo SVG | `index.html` | Elemento `<svg>` dentro de `.logo` |
| Nombre del negocio | `index.html` | `.logo-text` y etiqueta `<title>` |
| Datos de transferencia | `assets/js/app.js` | `CONFIG.PAY_NUMBER` y `CONFIG.PAY_HOLDER` |
| Umbral de stock bajo | `apps-script/LIMPIEZARR.gs` | `descontarStock()` → condición `nuevoStock <= 5` |
| Clasificación VIP | `apps-script/LIMPIEZARR.gs` | `clasificarCliente()` |
| Pedidos por página en admin | `admin/admin.logic.js` | Constante `porPagina` |
| TTL del caché de productos | `assets/js/app.js` | Constante `CACHE_TTL` |
| TTL del caché del dashboard | `apps-script/LIMPIEZARR.gs` | `cache.put(CACHE_KEY, ..., 300)` — segundos |

---

## 🚀 Despliegue en producción

### GitHub Pages (recomendado)

1. Crea un repositorio en [github.com](https://github.com)
2. Sube todos los archivos y la carpeta `icons/`
3. Ve a **Settings → Pages → Source: Branch: main → Save**
4. La tienda queda disponible en:  
   `https://tuusuario.github.io/nombre-repositorio/`
5. El panel admin en:  
   `https://tuusuario.github.io/nombre-repositorio/admin.html`

### Netlify Drop (más rápido, sin cuenta)

1. Ve a [netlify.com/drop](https://netlify.com/drop)
2. Arrastra la carpeta completa del proyecto
3. Netlify genera un link público con HTTPS al instante

---

## 📱 PWA — Instalar como app

Los archivos `manifest.json` y `sw.js` (v2) ya están configurados. El Service Worker cachea:

- `index.html`, `Admin.html`, `assets/css/styles.css`, `assets/js/app.js`, `tools/GenerateIcons.html`
- Google Fonts (caché persistente)
- Imágenes de productos de Google Drive (caché con actualización en background)

**Estrategias de caché por tipo de recurso:**
- Assets locales → **Cache First** con actualización en background
- Apps Script → **Network Only** (datos siempre frescos)
- Google Fonts/Drive → **Cache First**

---

## 📞 Datos del negocio

| Campo | Valor |
|---|---|
| Nombre | Limpieza RR |
| WhatsApp / Teléfono | +57 350 344 3140 |
| Número de pagos | 3203346819 |
| País | Colombia 🇨🇴 |
| Ciudad | Bogotá y alrededores |
| Medios de pago | Transferencia bancaria, Nequi, Breb, Daviplata, Contra entrega |

---

## 🗂️ Categorías de productos

Las categorías se generan automáticamente desde la columna `categoria` del Sheet. Agregar una nueva categoría en Sheets la hace aparecer en los filtros del catálogo sin tocar el código.

Categorías actuales (44 productos):
- **Ceras** — Autobrillante, Selladora, Desmanchadora
- **Detergentes** — Multiusos, Línea Hogar, Desengrasante
- **Fragancias** — Aromatizante, Perfume de Pisos, Splash
- **Antibacteriales** — Germicida, Multiusos, Spray
- **Lavaloza** — Crema y Líquido
- **Limpiapisos** — Encanto Tropical varios tamaños
- **Limpia Vidrios** — Envase y Galón
- **Otros** — Oxígeno Activo, Suavizante

---

## ✅ Compatibilidad de navegadores

| Navegador | Soporte |
|---|---|
| Chrome 80+ | ✅ Completo (recomendado) |
| Firefox 22+ | ✅ Completo |
| Safari 9+ — iOS/macOS | ✅ Completo (prefijo `-webkit-backdrop-filter` incluido) |
| Edge 80+ | ✅ Completo |
| Samsung Internet | ✅ Completo |

---

## 📄 Licencia

Proyecto privado de **Limpieza RR**. Todos los derechos reservados © 2026.
