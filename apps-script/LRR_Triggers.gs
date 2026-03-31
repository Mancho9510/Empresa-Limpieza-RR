/* ──────────────────────────────────────────────────────────────
   LRR_Triggers.gs
   Gatillos de Google Apps Script para Validación en Tiempo Real
────────────────────────────────────────────────────────────── */

function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  if (sheetName === "Productos" || sheetName === "Cupones") {
    validarUnicidad(e, sheet, sheetName);
  }
}

function validarUnicidad(e, sheet, sheetName) {
  var range = e.range;
  var col = range.getColumn();
  var row = range.getRow();
  var val = String(e.value || "").trim();
  
  if (row < 2 || !val || val === "undefined") {
    // Si borran la celda, resetear el fondo por si estaba en rojo
    if (row >= 2) range.setBackground("#FFFFFF").setFontColor("#000000").setFontWeight("normal");
    return;
  }

  var colClave = 0;
  if (sheetName === "Productos" && typeof PRODUCTOS_HEADERS !== "undefined") {
    colClave = PRODUCTOS_HEADERS.indexOf("id") + 1;
  } else if (sheetName === "Cupones" && typeof CUPONES_HEADERS !== "undefined") {
    colClave = CUPONES_HEADERS.indexOf("codigo") + 1;
  }
  
  if (colClave === 0 || col !== colClave) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  var values = sheet.getRange(2, colClave, lastRow - 1, 1).getValues();
  
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === val.toLowerCase()) {
      count++;
    }
  }
  
  if (count > 1) {
    range.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
    if (e.source) {
      e.source.toast("El valor '" + val + "' ya existe en otra fila.", "⛔ DUPLICADO", 10);
    }
  } else {
    range.setBackground("#FFFFFF").setFontColor("#000000").setFontWeight("normal");
  }
}
