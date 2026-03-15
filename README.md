# 🧴 Limpieza RR — Tienda Web de Productos de Aseo

Sitio web completo de catálogo y ventas para **Limpieza RR**, empresa colombiana de productos de aseo premium. Los clientes navegan el catálogo, agregan productos al carrito y realizan pedidos directamente por **WhatsApp**. Todo queda registrado automáticamente en **Google Sheets** como base de datos.

---

## 📁 Estructura del proyecto

```
limpieza-rr/
├── index.html              # Tienda web (página principal)
├── admin.html              # Panel de administración
├── styles.css              # Todos los estilos
├── app.js                  # Lógica completa del frontend
├── manifest.json           # Configuración PWA
├── sw.js                   # Service Worker (caché offline)
├── icons/
│   ├── icon-192.png        # Ícono PWA (requerido)
│   └── icon-512.png        # Ícono PWA (requerido)
├── LIMPIEZARR.gs           # Apps Script — API principal (doGet/doPost)
├── LIMPIEZARR_Setup.gs     # Apps Script — Poblar productos
├── LIMPIEZARR_Admin.gs     # Apps Script — Inicializar hojas, backups, reparaciones
├── LIMPIEZARR_Formato.gs   # Apps Script — Auto-formato de tablas
├── LIMPIEZARR_Dashboard.gs # Apps Script — Dashboard, cupones, email, calificaciones
└── README.md               # Este archivo
```

> ⚠️ El archivo `appsscript.gs` es una versión monolítica anterior. Usar los 5 archivos `LIMPIEZARR_*.gs` que son la versión actual y correcta.

---

## ✨ Funcionalidades completas

### 🛒 Tienda (`index.html`)

| Función | Descripción |
|---|---|
| **Hero** | Sección de bienvenida con estadísticas y CTA |
| **Carrusel de destacados** | Productos con `destacado=TRUE` rotan automáticamente |
| **Catálogo completo** | Grid con filtros por categoría |
| **Barra de búsqueda** | Filtra en tiempo real por nombre, categoría y descripción |
| **Galería de imágenes** | Hasta 3 fotos por producto (columnas `imagen`, `imagen2`, `imagen3`) |
| **Control de stock** | Badge "Agotado" / "¡Solo X!" según columna `stock` en Sheets |
| **Modal de producto** | Descripción, galería, precio y selector de cantidad |
| **Carrito lateral** | Subtotal en tiempo real, ajuste de cantidades |
| **Cupones de descuento** | Campo para ingresar código — valida contra hoja `Cupones` |
| **Formulario de pedido** | Nombre, teléfono, dirección, zona de envío, medio de pago |
| **Zonas de envío Bogotá** | 7 zonas con precios entre $5.000 y $20.000 + precio a convenir |
| **Pedido por WhatsApp** | Genera mensaje formateado y lo envía al número del negocio |
| **Historial de pedidos** | El cliente consulta sus pedidos ingresando su teléfono |
| **Rastrear pedido** | El cliente ve el estado de envío (Recibido → Entregado) |
| **Calificación post-pedido** | Modal de 1-5 estrellas + comentario al confirmar pedido |
| **PWA** | Se instala como app en el celular desde el navegador |
| **Caché offline** | Productos guardados 30 min en localStorage para carga instantánea |
| **Diseño responsivo** | Móvil, tablet y escritorio |

### 🖥️ Panel Admin (`admin.html`)

| Función | Descripción |
|---|---|
| **Login protegido** | Clave de acceso requerida para entrar |
| **Vista de pedidos** | Últimos 50 pedidos con todos los datos |
| **Estadísticas** | Totales, pendientes de pago, en camino, entregados |
| **Filtros** | Por nombre, teléfono, barrio, estado de pago y estado de envío |
| **Actualizar estado** | Cambia estado de pago y estado de envío con un clic → guarda en Sheets |
| **Avisar al cliente** | Botón que abre WhatsApp con mensaje pre-escrito según el estado |

### 📊 Google Sheets (base de datos)

| Hoja | Descripción |
|---|---|
| **Productos** | Catálogo completo con imágenes, stock, precios |
| **Pedidos** | Registro de todos los pedidos recibidos |
| **Clientes** | Base de clientes con historial y clasificación automática |
| **Cupones** | Códigos de descuento configurables |
| **Calificaciones** | Reseñas de clientes |
| **Resumen** | Dashboard automático con métricas del negocio |

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 / CSS3 / JS ES6+ | Tienda web y panel admin |
| Google Sheets | Base de datos de productos, pedidos y clientes |
| Google Apps Script | API REST gratuita que conecta la web con Sheets |
| Google Drive | Almacenamiento de imágenes de productos |
| Google Fonts (Syne + Outfit) | Tipografías |
| WhatsApp API | Envío de pedidos y notificaciones al cliente |
| Service Worker + manifest.json | PWA — instalable como app |
| localStorage | Caché de productos con expiración de 30 minutos |

---

## ⚙️ Configuración de Google Sheets

### Estructura de hojas

#### `Productos` (12 columnas)

| id | nombre | tamano | precio | categoria | destacado | emoji | descripcion | imagen | imagen2 | imagen3 | stock |
|----|--------|--------|--------|-----------|-----------|-------|-------------|--------|---------|---------|-------|

- `destacado`: `TRUE` = aparece en el carrusel del hero
- `imagen` / `imagen2` / `imagen3`: URL de Google Drive o URL directa de imagen
- `stock`: vacío = sin control, número = unidades disponibles, `0` = agotado

#### `Pedidos` (20 columnas)

```
fecha | nombre | telefono | ciudad | departamento | barrio | direccion |
casa | conjunto | nota | cupon | descuento | pago | zona_envio |
costo_envio | subtotal | total | estado_pago | estado_envio | productos
```

- `estado_pago`: `PENDIENTE` / `PAGADO` / `CONTRA ENTREGA`
- `estado_envio`: `Recibido` / `En preparación` / `En camino` / `Entregado`

#### `Clientes` (10 columnas)

```
primera_compra | ultima_compra | nombre | telefono | ciudad |
barrio | direccion | total_pedidos | total_gastado | tipo
```

- `tipo`: se actualiza automáticamente → `Nuevo` / `Recurrente` / `VIP`

#### `Cupones` (8 columnas)

```
codigo | descripcion | tipo | valor | usos_maximos | usos_actuales | vencimiento | activo
```

- `tipo`: `pct` = porcentaje, `fixed` = valor fijo en pesos
- `valor`: si `pct` escribe `10` para 10%. Si `fixed` escribe `5000` para $5.000

---

## 🚀 Apps Script — Setup inicial

El backend son **5 archivos `.gs`** que van en el mismo proyecto de Apps Script. Todos comparten las mismas funciones automáticamente.

### Paso 1 — Crear los 5 archivos en Apps Script

En tu Google Sheet ve a **Extensiones → Apps Script** y crea 5 archivos con estos nombres exactos:

| Archivo | Contenido |
|---|---|
| `LIMPIEZARR` | API principal (`doGet`, `doPost`, lógica de pedidos) |
| `LIMPIEZARR_Setup` | Poblar productos (`populateProductos`, `resetearProductos`) |
| `LIMPIEZARR_Admin` | Inicializar hojas, backups, reparaciones |
| `LIMPIEZARR_Formato` | Auto-formato de tablas, disparador `onEdit` |
| `LIMPIEZARR_Dashboard` | Dashboard, cupones, email, calificaciones |

### Paso 2 — Ejecutar el setup completo

En el editor de Apps Script ejecuta **en este orden**:

```
1. configuracionInicial()   → Crea hojas Productos, Pedidos, Clientes
2. setupCompleto()          → Crea hojas Cupones + genera Dashboard inicial
3. instalarDisparador()     → Activa el auto-formato en cada edición
4. limpiarStock()           → Limpia la columna stock (ningún producto queda agotado por defecto)
```

### Paso 3 — Publicar como Web App

1. Click en **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo**
4. Acceso: **Cualquier usuario**
5. Copia la URL generada

### Paso 4 — Pegar la URL en `app.js` y `admin.html`

En `app.js` (línea ~15):
```javascript
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/TU_ID/exec",
  WA_NUMBER: "573503443140",
  ...
};
```

En `admin.html` (línea ~3 del script):
```javascript
const APPS_URL = "https://script.google.com/macros/s/TU_ID/exec";
```

---

## 🔄 Republicar el Web App (obligatorio tras cambios)

Cada vez que modifiques cualquier archivo `.gs`:

```
Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar
```

> La URL no cambia. Los datos no se pierden.

---

## 📦 Control de inventario

### Cómo manejar el stock desde Sheets

| Celda `stock` | Qué ve el cliente |
|---|---|
| *(vacía)* | Producto normal, sin límite |
| `50` | Disponible normalmente |
| `3` | Badge **"¡Solo 3!"** en amarillo |
| `0` | Badge **"Agotado"** en rojo, no se puede comprar |

### Alertas automáticas de stock

Al recibir un pedido, si el stock de algún producto queda en 0 o ≤ 5:
- La celda en Sheets se colorea automáticamente (🔴 agotado / 🟡 bajo / 🟢 normal)
- Se envía un **email automático** con el listado de productos afectados

Para revisar el inventario completo en cualquier momento:
```
verificarStockCompleto()   → envía reporte por email de todos los productos con alerta
```

---

## 🖼️ Imágenes de productos desde Google Drive

1. Sube la foto a Google Drive
2. Click derecho → **Obtener enlace** → cambia a **"Cualquier persona con el enlace"**
3. Pega el enlace en la columna `imagen`, `imagen2` o `imagen3` del Sheet
4. El sistema convierte automáticamente el link al formato de imagen directa

Formatos aceptados:
- `https://drive.google.com/file/d/FILE_ID/view` → se convierte automáticamente
- `https://drive.google.com/open?id=FILE_ID` → se convierte automáticamente
- Cualquier URL directa de imagen (jpg, png, webp)

---

## 🏷️ Cupones de descuento

Administra los cupones directamente desde la hoja `Cupones` en Sheets:

| codigo | descripcion | tipo | valor | usos_maximos | usos_actuales | vencimiento | activo |
|--------|-------------|------|-------|--------------|---------------|-------------|--------|
| BIENVENIDO | 10% bienvenida | pct | 10 | | 0 | | TRUE |
| PROMO5K | Descuento $5.000 | fixed | 5000 | 100 | 0 | | TRUE |

---

## 🔐 Panel de administración

**URL:** `https://tuusuario.github.io/limpieza-rr/admin.html`

**Clave de acceso:** `LIMPIEZARR2025`

> Para cambiar la clave, edita la constante `ADMIN_KEY` en `admin.html` y la verificación `"LIMPIEZARR2025"` en `LIMPIEZARR.gs`.

### Estados disponibles

**Estado de pago:**
- `PENDIENTE` → fondo rojo en Sheets
- `PAGADO` → fondo verde en Sheets
- `CONTRA ENTREGA` → fondo amarillo en Sheets

**Estado de envío:**
- `Recibido` → pedido recibido, aún no procesado
- `En preparación` → se está alistando el pedido
- `En camino` → en camino al cliente
- `Entregado` → entregado exitosamente

---

## 🛡️ Seguridad de la base de datos

### Funciones peligrosas — ejecutar solo una vez

```
configuracionInicial()   ← borra y recrea hojas
populateProductos()      ← solo actúa si la hoja está vacía (protección automática)
resetearProductos()      ← fuerza recreación de productos (usar solo si la hoja está vacía)
```

### Antes de cualquier cambio grande

```
hacerBackup()   → crea copias "BKP NombreHoja fecha" en el mismo Sheet
```

### Funciones de diagnóstico y reparación

```
verificarEstructura()          → verifica que todas las hojas tienen las columnas correctas
repararColumnasPedidos()       → agrega columna telefono si falta (sin borrar datos)
repararEsquemaPedidosV2()     → repara el esquema completo a 20 columnas (sin borrar datos)
verificarStockCompleto()       → envía email con reporte de stock bajo/agotado
limpiarBackups()               → elimina todas las hojas de backup BKP
```

### Auto-formato de tablas

```
formatearTodo()        → aplica formato visual a las 3 hojas principales
instalarDisparador()   → activa el auto-formato en cada edición (ejecutar una vez)
refrescarDashboard()   → actualiza manualmente la hoja Resumen con métricas actuales
```

---

## 🚀 Despliegue en producción

### GitHub Pages (recomendado)

1. Crea un repositorio en [github.com](https://github.com)
2. Sube todos los archivos del proyecto
3. Ve a **Settings → Pages → Branch: main → Save**
4. La tienda queda en: `https://tuusuario.github.io/nombre-repositorio`
5. El panel admin en: `https://tuusuario.github.io/nombre-repositorio/admin.html`

### Netlify Drop (más rápido, sin cuenta)

1. Ve a [netlify.com/drop](https://netlify.com/drop)
2. Arrastra la carpeta del proyecto
3. Netlify genera un link público al instante

---

## 📱 PWA — Instalar como app

Los archivos `manifest.json` y `sw.js` ya están configurados. Para activar completamente la PWA:

1. Crea la carpeta `icons/` en el repositorio
2. Agrega dos imágenes PNG del logo:
   - `icons/icon-192.png` (192×192 px)
   - `icons/icon-512.png` (512×512 px)
3. Los usuarios verán un banner automático en Chrome/Edge para instalar la app

---

## 🧩 Personalización rápida

| Qué cambiar | Dónde |
|---|---|
| Número de WhatsApp | `app.js` → `CONFIG.WA_NUMBER` |
| URL del Apps Script | `app.js` → `CONFIG.APPS_SCRIPT_URL` y `admin.html` → `APPS_URL` |
| Clave del panel admin | `admin.html` → `ADMIN_KEY` y `LIMPIEZARR.gs` → `"LIMPIEZARR2025"` |
| Velocidad del carrusel | `app.js` → `CONFIG.AUTOPLAY_MS` (milisegundos) |
| Colores del sitio | `styles.css` → bloque `:root` |
| Logo SVG | `index.html` → `<svg>` dentro de `.logo` |
| Nombre del negocio | `index.html` → `.logo-text` y `<title>` |
| Umbral stock bajo | `LIMPIEZARR.gs` → `descontarStock()` → condición `nuevoStock <= 5` |
| Clasificación VIP | `LIMPIEZARR.gs` → `clasificarCliente()` |

---

## 📋 Formulario de pedido — campos

| Campo | Requerido | Descripción |
|---|---|---|
| Nombre completo | ✅ | Nombre del cliente |
| Teléfono / WhatsApp | ✅ | Clave para historial y deduplicación de clientes |
| Ciudad | ✅ | Ciudad de entrega |
| Departamento | ✅ | Departamento |
| Barrio | ✅ | Barrio de entrega |
| Dirección | ✅ | Dirección completa |
| Casa / Apartamento | No | Número de apto o piso |
| Nombre del conjunto | No | Si aplica |
| Nota adicional | No | Instrucciones especiales |
| Cupón de descuento | No | Código de descuento |
| Medio de pago | ✅ | Transferencia / Nequi / Breb / Daviplata / Contra entrega |
| Zona de envío | ✅ | Selección de zona de Bogotá |

---

## 🚚 Zonas de envío — Bogotá

| Zona | Barrios | Costo |
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

## 📞 Datos del negocio

| Campo | Valor |
|---|---|
| Nombre | Limpieza RR |
| WhatsApp / Teléfono | +57 350 344 3140 |
| País | Colombia 🇨🇴 |
| Medios de pago | Transferencia, Nequi, Breb, Daviplata, Contra entrega |

---

## ✅ Compatibilidad de navegadores

| Navegador | Soporte |
|---|---|
| Chrome 80+ | ✅ Completo |
| Firefox 22+ | ✅ Completo |
| Safari 9+ (iOS/macOS) | ✅ Completo (prefijo `-webkit-backdrop-filter`) |
| Edge 80+ | ✅ Completo |
| Samsung Internet | ✅ Completo |

---

## 📄 Licencia

Proyecto privado de **Limpieza RR**. Todos los derechos reservados © 2025.