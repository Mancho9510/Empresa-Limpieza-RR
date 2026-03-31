/* ══════════════════════════════════════════════════════════════
   REPARAR ESQUEMA DE PEDIDOS v2
   
   Problema: la hoja Pedidos fue creada con el esquema antiguo
   (17 columnas sin cupon, descuento, estado_envio) y los nuevos
   pedidos se guardaron con el esquema nuevo (20 columnas),
   desplazando todos los valores.
   
   CÓMO FUNCIONA:
   1. Lee todos los datos actuales
   2. Identifica qué filas tienen esquema viejo vs nuevo
   3. Reconstruye toda la hoja correctamente
   4. Aplica formato profesional
   
   EJECUTAR UNA SOLA VEZ.
   Hacer backup antes con hacerBackup().
══════════════════════════════════════════════════════════════ */
function repararEsquemaPedidosV2() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pedidos");
  if (!sheet) { Logger.log("Hoja Pedidos no encontrada"); return; }

  // ── Esquemas ──────────────────────────────────────────────
  const SCHEMA_NUEVO = [
    "fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
    "casa","conjunto","nota","cupon","descuento","pago","zona_envio","costo_envio",
    "subtotal","total","estado_pago","estado_envio","productos","productos_json"
  ]; // 21 columnas — productos_json agregado en v3 para parsing robusto

  const SCHEMA_VIEJO = [
    "fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
    "casa","conjunto","nota","pago","zona_envio","costo_envio",
    "subtotal","total","estado_pago","productos"
  ]; // 17 columnas (sin cupon, descuento, estado_envio)

  const SCHEMA_VIEJO2 = [
    "fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
    "casa","conjunto","nota","pago","zona_envio","costo_envio",
    "subtotal","total","estado_pago","estado_envio","productos"
  ]; // 18 columnas (sin cupon, descuento pero con estado_envio)

  const _s      = leerSheet(ss, "Pedidos");
  const headers = _s.headers || [];
  const filas   = _s.rows || [];

  Logger.log("Encabezados actuales: " + headers.join(" | "));
  Logger.log("Filas de datos: " + filas.length);

  // ── Detectar esquema actual ───────────────────────────────
  const tieneCupon      = headers.includes("cupon");
  const tieneDescuento  = headers.includes("descuento");
  const tieneEstadoEnv  = headers.includes("estado_envio");

  Logger.log("Tiene cupon: " + tieneCupon + " | descuento: " + tieneDescuento + " | estado_envio: " + tieneEstadoEnv);

  // Si tiene 21 columnas con productos_json ya está en v3
  var tieneProductosJson = headers.includes("productos_json");
  if (tieneCupon && tieneDescuento && tieneEstadoEnv && tieneProductosJson && headers.length >= 21) {
    Logger.log("El esquema ya está correcto (21 columnas con productos_json). No se requiere reparación.");
    return;
  }
  // Si tiene 20 columnas (v2) solo agregar productos_json al final
  if (tieneCupon && tieneDescuento && tieneEstadoEnv && !tieneProductosJson && headers.length >= 20) {
    Logger.log("Esquema v2 detectado (20 columnas). Agregando columna productos_json...");
    var lastCol = sheet.getLastColumn();
    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue("productos_json")
      .setFontWeight("bold").setBackground("#0D9488").setFontColor("#FFFFFF");
    Logger.log("✅ Columna productos_json agregada. Sin pérdida de datos.");
    return;
  }

  // ── Mapear índices del esquema actual ─────────────────────
  const CI = {}; // Column Index actual
  headers.forEach((h, i) => CI[h] = i);

  // ── Reconstruir filas al esquema nuevo ────────────────────
  const filasReparadas = filas.map(r => {
    const get = (col) => {
      const idx = CI[col];
      return (idx !== undefined && r[idx] !== undefined) ? r[idx] : "";
    };

    return [
      get("fecha"),
      get("nombre"),
      get("telefono"),
      get("ciudad"),
      get("departamento"),
      get("barrio"),
      get("direccion"),
      get("casa"),
      get("conjunto"),
      get("nota"),
      get("cupon")       || "",              // nuevo — vacío en filas viejas
      get("descuento")   || 0,               // nuevo — 0 en filas viejas
      get("pago")        || get("medio_pago") || "",
      get("zona_envio"),
      get("costo_envio") || 0,
      get("subtotal")    || 0,
      get("total")       || 0,
      get("estado_pago") || "PENDIENTE",
      get("estado_envio")|| "Recibido",      // nuevo — "Recibido" en filas viejas
      get("productos"),
    ];
  });

  // ── Reescribir la hoja ────────────────────────────────────
  sheet.clearContents();

  // Encabezado
  sheet.appendRow(SCHEMA_NUEVO);
  const hdr = sheet.getRange(1, 1, 1, SCHEMA_NUEVO.length);
  hdr.setFontWeight("bold")
     .setBackground("#0D9488")
     .setFontColor("#FFFFFF")
     .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  // Datos
  if (filasReparadas.length > 0) {
    sheet.getRange(2, 1, filasReparadas.length, SCHEMA_NUEVO.length)
         .setValues(filasReparadas);
  }

  // Formato moneda en columnas numéricas (descuento, costo_envio, subtotal, total)
  const monedaCols = [12, 15, 16, 17]; // base-1
  monedaCols.forEach(col => {
    if (filasReparadas.length > 0) {
      sheet.getRange(2, col, filasReparadas.length, 1)
           .setNumberFormat("$ #,##0");
    }
  });

  // Colores alternados en filas
  for (let r = 2; r <= filasReparadas.length + 1; r++) {
    const bg = r % 2 === 0 ? "#F0FDF9" : "#FFFFFF";
    sheet.getRange(r, 1, 1, SCHEMA_NUEVO.length).setBackground(bg);
  }

  // Color en estado_pago (col 18)
  for (let r = 2; r <= filasReparadas.length + 1; r++) {
    const cell  = sheet.getRange(r, 18);
    const val   = String(cell.getValue()).toUpperCase();
    if (val.includes("PAGADO")) {
      cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    } else if (val.includes("CONTRA")) {
      cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
    } else {
      cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
    }
  }

  sheet.autoResizeColumns(1, SCHEMA_NUEVO.length);

  const msg = "Reparación completada.\n\n" +
    "Esquema anterior: " + headers.length + " columnas\n" +
    "Esquema nuevo: " + SCHEMA_NUEVO.length + " columnas\n" +
    "Filas reparadas: " + filasReparadas.length;

  Logger.log(msg);
  Logger.log("✅ " + msg);
}

/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Admin: Inicializar, Backup, Formato (LIMPIEZARR_Admin.gs)
═══════════════════════════════════════════════════════════ */

function inicializarPedidos() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Pedidos");
  if (!sheet) sheet = ss.insertSheet("Pedidos");

  asegurarEncabezados(sheet, PEDIDOS_HEADERS);
  aplicarEstiloBasicoEncabezado(sheet, "#0D9488", "#FFFFFF");
  aplicarFormatoMonedaPorEncabezado(sheet, ["descuento", "costo_envio", "subtotal", "total"]);
  if (typeof formatearComoTabla === "function") formatearComoTabla("Pedidos");
  Logger.log('OK: hoja "Pedidos" lista.');
}

/* ──────────────────────────────────────────────────────────────
   INICIALIZAR CLIENTES
────────────────────────────────────────────────────────────── */
function inicializarClientes() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Clientes");
  if (!sheet) sheet = ss.insertSheet("Clientes");

  asegurarEncabezados(sheet, CLIENTES_HEADERS);
  aplicarEstiloBasicoEncabezado(sheet, "#14B8A6", "#FFFFFF");
  aplicarFormatoMonedaPorEncabezado(sheet, ["total_gastado"]);
  ponerNotaPorEncabezado(sheet, "tipo",
    "Clasificacion automatica:\n" +
    "Nuevo      = 1 pedido\n" +
    "Recurrente = 2+ pedidos o $150.000+\n" +
    "VIP        = 10+ pedidos o $500.000+"
  );
  if (typeof formatearComoTabla === "function") formatearComoTabla("Clientes");
  Logger.log('OK: hoja "Clientes" lista.');
}

function inicializarProveedores() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Proveedores");
  if (!sheet) sheet = ss.insertSheet("Proveedores");

  asegurarEncabezados(sheet, PROVEEDORES_HEADERS);
  aplicarEstiloBasicoEncabezado(sheet, "#0F766E", "#FFFFFF");
  if (typeof formatearComoTabla === "function") formatearComoTabla("Proveedores");
  Logger.log('OK: hoja "Proveedores" lista.');
}

/* ══════════════════════════════════════════════════════════════
   BACKUP MANUAL — ejecutar antes de cualquier cambio grande
   Crea copias de seguridad de las hojas principales con fecha y hora
══════════════════════════════════════════════════════════════ */
function hacerBackup() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const fecha   = Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd HH:mm:ss");
  const hojas   = ["Productos", "Pedidos", "Clientes", "Proveedores", "Cupones", "Dashboard", "Resumen"];
  const creadas = [];

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) return;
    if (creadas.indexOf("BKP " + nombre + " " + fecha) >= 0) return;
    const copia = sheet.copyTo(ss);
    copia.setName("BKP " + nombre + " " + fecha);
    // Mover la copia al final
    ss.setActiveSheet(copia);
    ss.moveActiveSheet(ss.getNumSheets());
    creadas.push("BKP " + nombre + " " + fecha);
  });

  Logger.log(
    "=== BACKUP COMPLETADO ===\n" +
    "Hojas de respaldo creadas:\n" +
    creadas.join("\n") + "\n\n" +
    "Puedes eliminarlas cuando ya no las necesites."
  );
}

/* ══════════════════════════════════════════════════════════════
   ELIMINAR BACKUPS ANTIGUOS
   Borra todas las hojas que empiecen con "BKP"
══════════════════════════════════════════════════════════════ */
function limpiarBackups() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = ss.getSheets();
  let count   = 0;

  hojas.forEach(sheet => {
    if (sheet.getName().startsWith("BKP")) {
      ss.deleteSheet(sheet);
      count++;
    }
  });

  Logger.log("Backups eliminados: " + count);
}

/* ══════════════════════════════════════════════════════════════
   AUTO-TABLA
   Aplica formato de tabla profesional a las 3 hojas.
   Se ejecuta automáticamente cada vez que se agrega una fila
   gracias al disparador instalado con instalarDisparador().
══════════════════════════════════════════════════════════════ */

// Paleta de colores por hoja
const TEMAS = {
  "Productos": {
    hdrBg:   "#0F766E",  // encabezado fondo
    hdrFg:   "#FFFFFF",  // encabezado texto
    rowPar:  "#F0FDF9",  // fila par
    rowImpar:"#FFFFFF",  // fila impar
    border:  "#99F6E4",  // color de bordes
    imgCol:  "#FFF9C4",  // columna imagen (amarillo suave)
  },
  "Pedidos": {
    hdrBg:   "#0D9488",
    hdrFg:   "#FFFFFF",
    rowPar:  "#F0FDF9",
    rowImpar:"#FFFFFF",
    border:  "#99F6E4",
    imgCol:  null,
  },
  "Clientes": {
    hdrBg:   "#14B8A6",
    hdrFg:   "#FFFFFF",
    rowPar:  "#ECFDF5",
    rowImpar:"#FFFFFF",
    border:  "#6EE7B7",
    imgCol:  null,
  },
  "Proveedores": {
    hdrBg:   "#0F766E",
    hdrFg:   "#FFFFFF",
    rowPar:  "#F0FDFA",
    rowImpar:"#FFFFFF",
    border:  "#99F6E4",
    imgCol:  null,
  },
  "Cupones": {
    hdrBg:   "#F59E0B",
    hdrFg:   "#FFFFFF",
    rowPar:  "#FFFBEB",
    rowImpar:"#FFFFFF",
    border:  "#FCD34D",
    imgCol:  null,
  },
  "Calificaciones": {
    hdrBg:   "#F59E0B",
    hdrFg:   "#FFFFFF",
    rowPar:  "#FFFBEB",
    rowImpar:"#FFFFFF",
    border:  "#FCD34D",
    imgCol:  null,
  },
};

// ── Formato de tablas en LIMPIEZARR_Formato.gs ──

/* ──────────────────────────────────────────────────────────────
   CONFIGURACION INICIAL (movido de Setup)
────────────────────────────────────────────────────────────── */
function configuracionInicial() {
  populateProductos();
  inicializarPedidos();
  inicializarClientes();
  if (typeof inicializarProveedores    === "function") inicializarProveedores();
  if (typeof inicializarCupones        === "function") inicializarCupones();
  if (typeof formatearTodo             === "function") formatearTodo();
  if (typeof actualizarCategoriaSuavizantes === "function") actualizarCategoriaSuavizantes();
  if (typeof inicializarDashboard      === "function") inicializarDashboard();
  Logger.log("=== CONFIGURACION COMPLETA ===");
}

function inicializarBaseDeDatos() { configuracionInicial(); }