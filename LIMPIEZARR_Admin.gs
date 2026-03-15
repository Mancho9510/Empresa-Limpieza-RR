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
    "subtotal","total","estado_pago","estado_envio","productos"
  ]; // 20 columnas

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

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const filas   = data.slice(1).filter(r => r[0] !== "" && r[0] !== null);

  Logger.log("Encabezados actuales: " + headers.join(" | "));
  Logger.log("Filas de datos: " + filas.length);

  // ── Detectar esquema actual ───────────────────────────────
  const tieneCupon      = headers.includes("cupon");
  const tieneDescuento  = headers.includes("descuento");
  const tieneEstadoEnv  = headers.includes("estado_envio");

  Logger.log("Tiene cupon: " + tieneCupon + " | descuento: " + tieneDescuento + " | estado_envio: " + tieneEstadoEnv);

  if (tieneCupon && tieneDescuento && tieneEstadoEnv && headers.length >= 20) {
    Logger.log("El esquema ya está correcto (20 columnas). No se requiere reparación.");
    Logger.log("✅ El esquema ya está correcto. No se requiere reparación.");
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

  if (sheet.getLastRow() === 0) {
    const h = ["fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
               "casa","conjunto","nota","cupon","descuento","pago","zona_envio","costo_envio",
               "subtotal","total","estado_pago","estado_envio","productos"];
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setFontWeight("bold").setBackground("#0D9488").setFontColor("#fff");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, h.length);
    sheet.getRange(2,13,1000,3).setNumberFormat("$ #,##0.00");
  }
  Logger.log('OK: hoja "Pedidos" lista.');
}

/* ──────────────────────────────────────────────────────────────
   INICIALIZAR CLIENTES
────────────────────────────────────────────────────────────── */
function inicializarClientes() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Clientes");
  if (!sheet) sheet = ss.insertSheet("Clientes");

  if (sheet.getLastRow() === 0) {
    const h = ["primera_compra","ultima_compra","nombre","telefono","ciudad",
               "barrio","direccion","total_pedidos","total_gastado","tipo"];
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setFontWeight("bold").setBackground("#14B8A6").setFontColor("#fff");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, h.length);
    sheet.getRange(2,9,1000,1).setNumberFormat("$ #,##0.00");
    sheet.getRange(1,10).setNote(
      "Clasificacion automatica:\n" +
      "Nuevo      = 1 pedido\n" +
      "Recurrente = 2+ pedidos o $150.000+\n" +
      "VIP        = 10+ pedidos o $500.000+"
    );
  }
  Logger.log('OK: hoja "Clientes" lista.');
}

/* ══════════════════════════════════════════════════════════════
   BACKUP MANUAL — ejecutar antes de cualquier cambio grande
   Crea copias de seguridad de las 3 hojas con fecha y hora
══════════════════════════════════════════════════════════════ */
function hacerBackup() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const fecha   = Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd HH:mm");
  const hojas   = ["Productos", "Pedidos", "Clientes"];
  const creadas = [];

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) return;
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
};

/* ──────────────────────────────────────────────────────────────
   Formatea una hoja como tabla completa
────────────────────────────────────────────────────────────── */
// ── Formato de tablas en LIMPIEZARR_Formato.gs ──