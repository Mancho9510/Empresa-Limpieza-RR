# 🧴 Limpieza RR — Tienda Web de Productos de Aseo

Sitio web de catálogo y ventas para **Limpieza RR**, empresa colombiana de productos de aseo premium. Permite a los clientes ver el catálogo completo, agregar productos al carrito y realizar pedidos directamente por **WhatsApp**, con registro automático de pedidos en **Google Sheets**.

---

## 📁 Estructura del proyecto

```
limpieza-rr/
├── index.html      # Estructura HTML de la página
├── styles.css      # Todos los estilos de la interfaz
├── app.js          # Lógica de la aplicación + integración Google Sheets
└── README.md       # Este archivo
```

---

## ✨ Funcionalidades

- **Hero / Inicio** — sección de bienvenida con estadísticas del negocio
- **Carrusel de destacados** — productos marcados como TOP rotan automáticamente
- **Catálogo completo** — grid con filtros por categoría (Ceras, Detergentes, Fragancias, etc.)
- **Modal de producto** — descripción, precio y selector de cantidad al tocar un producto
- **Carrito lateral** — subtotal en tiempo real, ajuste de cantidades y eliminación
- **Formulario de pedido** — recoge datos de entrega y medio de pago
- **Envío por WhatsApp** — genera y envía el pedido formateado al número del negocio
- **Registro en Google Sheets** — cada pedido queda guardado automáticamente
- **Carga dinámica de productos** — el catálogo se lee desde Google Sheets en tiempo real
- **Datos de demostración** — si Sheets no está configurado, usa productos de ejemplo
- **Diseño responsivo** — adaptado para móvil, tablet y escritorio
- **Compatibilidad cross-browser** — Chrome, Firefox, Safari (iOS/macOS), Edge

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura semántica de la página |
| CSS3 | Estilos, animaciones y diseño responsivo |
| JavaScript (ES6+) | Lógica del carrito, modales y llamadas a la API |
| Google Sheets | Base de datos de productos y registro de pedidos |
| Google Apps Script | API gratuita que conecta la web con Sheets |
| Google Fonts | Tipografías Syne + Outfit |
| WhatsApp API | Envío de pedidos formateados |

---

## ⚙️ Configuración de Google Sheets

### 1. Crear el Google Sheet

Crea una hoja de cálculo con exactamente **dos pestañas**:

#### Pestaña `Productos` — columnas en fila 1:

| id | nombre | tamaño | precio | categoria | destacado | emoji | descripcion |
|----|--------|--------|--------|-----------|-----------|-------|-------------|
| 1 | Limpiapisos Encanto Tropical Envase | 1 Kg | 9000 | Limpiapisos | TRUE | 🌿 | Descripción del producto... |
| 2 | Desengrasante Multiusos Línea Hogar | 1 Kg | 10700 | Detergentes | TRUE | 🧽 | Descripción del producto... |

> ⚠️ La columna `destacado` debe ser `TRUE` o `FALSE`. Los `TRUE` aparecen en el carrusel del hero.

#### Pestaña `Pedidos` — columnas en fila 1 (se llenan automáticamente):

| fecha | nombre | barrio | direccion | casa | conjunto | nota | pago | productos | total |
|-------|--------|--------|-----------|------|----------|------|------|-----------|-------|

---

### 2. Crear el Apps Script

Dentro de la hoja ve a **Extensiones → Apps Script** y pega el siguiente código:

```javascript
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  if (e.parameter.action === "productos") {
    const data = SpreadsheetApp.openById(SHEET_ID)
      .getSheetByName("Productos").getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  SpreadsheetApp.openById(SHEET_ID)
    .getSheetByName("Pedidos").appendRow([
      new Date().toLocaleString("es-CO"),
      body.nombre, body.barrio, body.direccion,
      body.casa,   body.conjunto, body.nota,
      body.pago,   body.productos, body.total
    ]);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

### 3. Publicar como Web App

1. Click en **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo**
4. Acceso: **Cualquier usuario**
5. Click en **Implementar** y copia la URL generada

---

### 4. Pegar la URL en `app.js`

Abre `app.js` y en la sección `CONFIG` (línea ~20) reemplaza:

```javascript
// ❌ Antes
APPS_SCRIPT_URL: "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT",

// ✅ Después
APPS_SCRIPT_URL: "https://script.google.com/macros/s/TU_ID/exec",
```

> El proyecto actual ya tiene la URL configurada con el ID de implementación de Limpieza RR.

---

## 🚀 Despliegue

### Opción A — GitHub Pages (recomendado)

1. Crear un repositorio en [github.com](https://github.com)
2. Subir los 3 archivos (`index.html`, `styles.css`, `app.js`)
3. Ir a **Settings → Pages → Branch: main → Save**
4. La página queda disponible en:
   ```
   https://tuusuario.github.io/nombre-repositorio
   ```

### Opción B — Netlify Drop (más fácil, sin cuenta)

1. Ir a [netlify.com/drop](https://netlify.com/drop)
2. Arrastrar la carpeta del proyecto
3. Netlify genera un link público al instante

---

## 📞 Datos de contacto del negocio

| Campo | Valor |
|---|---|
| Nombre | Limpieza RR |
| WhatsApp / Teléfono | +57 350 344 3140 |
| País | Colombia 🇨🇴 |
| Medios de pago | Transferencia, Nequi, Breb, Daviplata |

---

## 🧩 Personalización rápida

| Qué cambiar | Dónde |
|---|---|
| Número de WhatsApp | `app.js` → `CONFIG.WA_NUMBER` |
| URL del Apps Script | `app.js` → `CONFIG.APPS_SCRIPT_URL` |
| Velocidad del carrusel | `app.js` → `CONFIG.AUTOPLAY_MS` (ms) |
| Colores principales | `styles.css` → bloque `:root` |
| Logo SVG | `index.html` → etiqueta `<svg>` dentro de `.logo` |
| Nombre del negocio | `index.html` → `.logo-text` y `<title>` |

---

## 🗂️ Categorías de productos disponibles

- Ceras
- Detergentes
- Fragancias
- Antibacteriales
- Lavaloza
- Limpiapisos
- Limpia Vidrios
- Otros

> Las categorías se generan automáticamente desde la columna `categoria` del Google Sheet. Agregar una nueva categoría en Sheets la hace aparecer en los filtros del catálogo sin tocar el código.

---

## 📋 Campos del formulario de pedido

| Campo | Requerido |
|---|---|
| Nombre completo | ✅ Sí |
| Barrio | ✅ Sí |
| Dirección | ✅ Sí |
| Casa / Apartamento | No |
| Nombre del conjunto | No |
| Nota adicional | No |
| Medio de pago | ✅ Sí |

---

## ✅ Compatibilidad de navegadores

| Navegador | Soporte |
|---|---|
| Chrome 80+ | ✅ Completo |
| Firefox 22+ | ✅ Completo |
| Safari 9+ (iOS/macOS) | ✅ Completo (prefijo `-webkit-`) |
| Edge 80+ | ✅ Completo |
| Samsung Internet | ✅ Completo |

---

## 📄 Licencia

Proyecto privado de **Limpieza RR**. Todos los derechos reservados © 2025.
