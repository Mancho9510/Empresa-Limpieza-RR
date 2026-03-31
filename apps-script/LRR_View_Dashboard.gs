/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Formato de Tablas v3
   Correcciones:
   ✅ BUG-07: Eliminadas las 3 funciones _legacy duplicadas
   ✅ BUG-08: onEditar reformateada — solo la fila editada, no toda la hoja
═══════════════════════════════════════════════════════════ */

// TEMAS está declarado en LIMPIEZARR_Admin.gs — compartido en el scope global de Apps Script.

/* ──────────────────────────────────────────────────────────────
   formatearComoTabla — aplica estilo completo a una hoja
────────────────────────────────────────────────────────────── */
function formatearComoTabla(nombreHoja) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) { Logger.log("Hoja no encontrada: " + nombreHoja); return; }

  var tema     = TEMAS[nombreHoja] || TEMAS["Pedidos"];
  var lastRow  = Math.max(sheet.getLastRow(), 2);
  var lastCol  = sheet.getLastColumn();
  if (lastCol === 0) return;

  // ── 1. Encabezado ──
  sheet.getRange(1, 1, 1, lastCol)
    .setBackground(tema.hdrBg).setFontColor(tema.hdrFg)
    .setFontWeight("bold").setFontSize(10)
    .setVerticalAlignment("middle").setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, tema.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  if (lastRow < 2) return;

  // ── 2. Filas alternadas ──
  for (var r = 2; r <= lastRow; r++) {
    var bg = r % 2 === 0 ? tema.rowPar : tema.rowImpar;
    sheet.getRange(r, 1, 1, lastCol)
      .setBackground(bg).setFontColor("#0F172A")
      .setFontWeight("normal").setFontSize(10)
      .setVerticalAlignment("middle")
      .setBorder(true, true, true, true, true, true, tema.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.setRowHeight(r, 28);
  }

  // ── 3. Columna imagen amarilla (solo Productos) ──
  if (tema.imgCol) {
    var headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var imgIndex = headers.indexOf("imagen");
    if (imgIndex !== -1) {
      sheet.getRange(1, imgIndex + 1, lastRow, 1).setBackground(tema.imgCol);
    }
  }

  // ── 4. Columna "tipo" en Clientes ──
  if (nombreHoja === "Clientes" && lastRow >= 2) {
    var hdr2   = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var tipoCol= hdr2.indexOf("tipo") + 1;
    if (tipoCol > 0) {
      var tipoVals = sheet.getRange(2, tipoCol, lastRow - 1, 1).getValues();
      tipoVals.forEach(function(row, i) {
        var cell = sheet.getRange(i + 2, tipoCol);
        var val  = String(row[0]).toLowerCase();
        if (val.includes("vip"))        cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        else if (val.includes("rec"))   cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
        else                            cell.setBackground("#EFF6FF").setFontColor("#1E40AF").setFontWeight("normal");
      });
    }
  }

  // ── 5. Columna "estado_pago" en Pedidos ──
  if (nombreHoja === "Pedidos" && lastRow >= 2) {
    var hdr3    = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var estCol  = hdr3.indexOf("estado_pago") + 1;
    if (estCol > 0) {
      var estVals = sheet.getRange(2, estCol, lastRow - 1, 1).getValues();
      estVals.forEach(function(row, i) {
        var cell = sheet.getRange(i + 2, estCol);
        var val  = String(row[0]).toUpperCase();
        if (val.includes("PAGADO"))         cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
        else if (val.includes("CONTRA"))    cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        else                                cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
      });
    }
  }

  sheet.autoResizeColumns(1, lastCol);
  Logger.log("Tabla formateada: " + nombreHoja + " (" + (lastRow - 1) + " filas)");
}

function formatearTodo() {
  ["Productos","Pedidos","Clientes","Proveedores","Cupones"].forEach(function(h) {
    formatearComoTabla(h);
  });
  Logger.log("=== Todas las tablas formateadas ===");
}

/* ──────────────────────────────────────────────────────────────
   DISPARADOR AUTOMÁTICO
   BUG-08 FIX: onEditar ahora solo reformatea la FILA editada,
   no toda la hoja. Evita timeouts con 500+ filas.
────────────────────────────────────────────────────────────── */
function instalarDisparador() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "onEditar") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onEditar")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  Logger.log("Disparador instalado.");
}

/**
 * BUG-08 FIX: En lugar de formatear TODA la hoja (que puede costar 30s+),
 * solo formateamos la fila específica que fue editada.
 * Si se agrega una fila nueva (fila > lastRow anterior), se formatea esa fila.
 */
function onEditar(e) {
  if (!e || !e.range) return;

  var nombreHoja = e.range.getSheet().getName();
  var hojasPrincipales = ["Productos","Pedidos","Clientes","Proveedores","Cupones","Calificaciones"];
  if (hojasPrincipales.indexOf(nombreHoja) === -1) return;

  var fila    = e.range.getRow();
  var sheet   = e.range.getSheet();
  var lastCol = sheet.getLastColumn();
  if (fila < 2 || lastCol === 0) return;  // fila 1 = encabezado, no tocar

  var tema    = TEMAS[nombreHoja] || TEMAS["Pedidos"];
  var bg      = fila % 2 === 0 ? tema.rowPar : tema.rowImpar;

  // Aplicar formato a la fila editada
  sheet.getRange(fila, 1, 1, lastCol)
    .setBackground(bg).setFontColor("#0F172A")
    .setFontWeight("normal").setFontSize(10)
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, tema.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.setRowHeight(fila, 28);

  // Color especial en "estado_pago" si se editó esa columna en Pedidos
  if (nombreHoja === "Pedidos") {
    var hdr    = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var estCol = hdr.indexOf("estado_pago") + 1;
    if (estCol > 0 && e.range.getColumn() === estCol) {
      var val  = String(e.value || "").toUpperCase();
      var cell = sheet.getRange(fila, estCol);
      if (val.includes("PAGADO"))       cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
      else if (val.includes("CONTRA"))  cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
      else                              cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
    }
  }

  // Color especial en "tipo" si se editó esa columna en Clientes
  if (nombreHoja === "Clientes") {
    var hdr2   = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var tipoCol= hdr2.indexOf("tipo") + 1;
    if (tipoCol > 0 && e.range.getColumn() === tipoCol) {
      var val2  = String(e.value || "").toLowerCase();
      var cell2 = sheet.getRange(fila, tipoCol);
      if (val2.includes("vip"))       cell2.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
      else if (val2.includes("rec"))  cell2.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
      else                            cell2.setBackground("#EFF6FF").setFontColor("#1E40AF").setFontWeight("normal");
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   REPARAR COLUMNAS PEDIDOS (migración)
────────────────────────────────────────────────────────────── */
function repararColumnasPedidos() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Pedidos");
  if (!sheet) { Logger.log("Hoja Pedidos no encontrada"); return; }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log("Encabezados actuales: " + headers.join(" | "));
  if (headers.indexOf("telefono") >= 0) {
    Logger.log("La columna 'telefono' ya existe.");
    return;
  }
  sheet.insertColumnAfter(2);
  sheet.getRange(1, 3).setValue("telefono")
    .setBackground("#0D9488").setFontColor("#fff").setFontWeight("bold");
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 3, lastRow - 1, 1).setBackground("#FFFFFF").setFontColor("#0F172A").setValue("");
  }
  sheet.autoResizeColumn(3);
  Logger.log("Columna 'telefono' insertada en posición 3.");
}

/* ──────────────────────────────────────────────────────────────
   VERIFICAR ESTRUCTURA
────────────────────────────────────────────────────────────── */
function verificarEstructura() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var esperado = {
    "Productos":   PRODUCTOS_HEADERS,
    "Pedidos":     PEDIDOS_HEADERS,
    "Clientes":    CLIENTES_HEADERS,
    "Proveedores": PROVEEDORES_HEADERS,
    "Cupones":     CUPONES_HEADERS,
  };
  Object.keys(esperado).forEach(function(nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (!sheet) { Logger.log("FALTA: " + nombre); return; }
    var actuales = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var esp      = esperado[nombre];
    var ok       = true;
    esp.forEach(function(col, i) {
      if (actuales[i] !== col) {
        Logger.log("ERROR " + nombre + " col " + (i+1) + ": esperado='" + col + "' actual='" + actuales[i] + "'");
        ok = false;
      }
    });
    if (ok) Logger.log("OK: " + nombre + " (" + actuales.length + " columnas)");
  });
}