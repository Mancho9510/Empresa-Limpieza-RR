/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Formato de Tablas (LIMPIEZARR_Formato.gs)
═══════════════════════════════════════════════════════════ */

function formatearComoTabla(nombreHoja) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) {
    Logger.log("Hoja no encontrada: " + nombreHoja);
    return;
  }

  const tema      = TEMAS[nombreHoja] || TEMAS["Pedidos"];
  const lastRow   = Math.max(sheet.getLastRow(), 2);
  const lastCol   = sheet.getLastColumn();
  if (lastCol === 0) return;

  const totalRows = lastRow;

  // ── 1. Encabezado ──────────────────────────────────────────
  const hdrRange = sheet.getRange(1, 1, 1, lastCol);
  hdrRange
    .setBackground(tema.hdrBg)
    .setFontColor(tema.hdrFg)
    .setFontWeight("bold")
    .setFontSize(10)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true,
               tema.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  if (totalRows < 2) return;

  // ── 2. Filas de datos con colores alternados ───────────────
  for (let r = 2; r <= totalRows; r++) {
    const rowRange = sheet.getRange(r, 1, 1, lastCol);
    const bg       = r % 2 === 0 ? tema.rowPar : tema.rowImpar;
    rowRange
      .setBackground(bg)
      .setFontColor("#0F172A")
      .setFontWeight("normal")
      .setFontSize(10)
      .setVerticalAlignment("middle")
      .setBorder(true, true, true, true, true, true,
                 tema.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.setRowHeight(r, 28);
  }

  // ── 3. Columna imagen en amarillo (solo Productos) ─────────
  if (tema.imgCol) {
    const headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const imgIndex = headers.indexOf("imagen");
    if (imgIndex !== -1) {
      const col = imgIndex + 1;
      sheet.getRange(1, col, totalRows, 1).setBackground(tema.imgCol);
    }
  }

  // ── 4. Columna "tipo" en Clientes con color por nivel ─────
  if (nombreHoja === "Clientes" && totalRows >= 2) {
    const headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const tipoIdx  = headers.indexOf("tipo");
    if (tipoIdx !== -1) {
      const col      = tipoIdx + 1;
      const valores  = sheet.getRange(2, col, totalRows - 1, 1).getValues();
      valores.forEach((row, i) => {
        const cell = sheet.getRange(i + 2, col);
        const val  = String(row[0]).toLowerCase();
        if (val.includes("vip")) {
          cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        } else if (val.includes("recurrente")) {
          cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
        } else {
          cell.setBackground("#EFF6FF").setFontColor("#1E40AF").setFontWeight("normal");
        }
      });
    }
  }

  // ── 5. Columna "estado_pago" en Pedidos con color ─────────
  if (nombreHoja === "Pedidos" && totalRows >= 2) {
    const headers     = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const estadoIdx   = headers.indexOf("estado_pago");
    if (estadoIdx !== -1) {
      const col    = estadoIdx + 1;
      const valores = sheet.getRange(2, col, totalRows - 1, 1).getValues();
      valores.forEach((row, i) => {
        const cell = sheet.getRange(i + 2, col);
        const val  = String(row[0]).toUpperCase();
        if (val.includes("PAGADO")) {
          cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
        } else if (val.includes("CONTRA")) {
          cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        } else {
          cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
        }
      });
    }
  }

  // ── 6. Ajustar anchos de columna ──────────────────────────
  sheet.autoResizeColumns(1, lastCol);

  Logger.log("Tabla formateada: " + nombreHoja + " (" + (totalRows - 1) + " filas)");
}

/* ──────────────────────────────────────────────────────────────
   Formatea las 3 hojas de una vez
────────────────────────────────────────────────────────────── */
function formatearTodo() {
  formatearComoTabla("Productos");
  formatearComoTabla("Pedidos");
  formatearComoTabla("Clientes");
  Logger.log("=== Todas las tablas formateadas ===");
}

/* ══════════════════════════════════════════════════════════════
   DISPARADOR AUTOMÁTICO
   Instala un trigger que formatea la hoja cada vez que
   se edita o agrega una fila nueva.
   Ejecutar instalarDisparador() UNA sola vez.
══════════════════════════════════════════════════════════════ */
function instalarDisparador() {
  // Eliminar disparadores anteriores del mismo tipo para no duplicar
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "onEditar") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Instalar disparador onEdit para el spreadsheet
  ScriptApp.newTrigger("onEditar")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log("Disparador instalado. Las tablas se formatearán automáticamente.");
}

/* ──────────────────────────────────────────────────────────────
   HANDLER del disparador — se ejecuta en cada edición
────────────────────────────────────────────────────────────── */
function onEditar(e) {
  if (!e) return;
  const nombreHoja = e.range.getSheet().getName();
  // Solo formatear las hojas principales, no los backups
  if (["Productos", "Pedidos", "Clientes"].includes(nombreHoja)) {
    formatearComoTabla(nombreHoja);
  }
}

/* ══════════════════════════════════════════════════════════════
   REPARAR COLUMNAS — ejecutar UNA vez si las columnas están
   desplazadas porque "telefono" no estaba en la hoja original.

   QUÉ HACE:
   1. Inserta la columna "telefono" en la posición correcta (col 3)
   2. Ajusta el formato de toda la fila de encabezados
   3. NO borra ningún dato existente

   CUÁNDO EJECUTAR:
   → Si la hoja "Pedidos" tiene datos pero sin columna "telefono"
══════════════════════════════════════════════════════════════ */
function repararColumnasPedidos() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pedidos");
  if (!sheet) { Logger.log("Hoja Pedidos no encontrada"); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log("Encabezados actuales: " + headers.join(" | "));

  // Verificar si ya existe la columna telefono
  if (headers.includes("telefono")) {
    Logger.log("La columna 'telefono' ya existe. No se realizaron cambios.");
    return;
  }

  // Insertar columna en posición 3 (después de "nombre")
  sheet.insertColumnAfter(2); // columna 2 = nombre → inserta col 3 nueva

  // Poner el encabezado
  const hdrCell = sheet.getRange(1, 3);
  hdrCell.setValue("telefono");
  hdrCell.setBackground("#0D9488").setFontColor("#fff").setFontWeight("bold");

  // Rellenar la nueva columna con vacío en filas existentes (ya está vacía, solo formatea)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 3, lastRow - 1, 1)
      .setBackground("#FFFFFF")
      .setFontColor("#0F172A")
      .setValue("");
  }

  sheet.autoResizeColumn(3);

  Logger.log(
    "Columna 'telefono' insertada en posicion 3.\n" +
    "Los pedidos anteriores quedan con telefono vacío (normal).\n" +
    "Los nuevos pedidos ya guardarán el teléfono correctamente."
  );
}

/* ──────────────────────────────────────────────────────────────
   VERIFICAR columnas de todas las hojas — diagnóstico
────────────────────────────────────────────────────────────── */
function verificarEstructura() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = ["Productos", "Pedidos", "Clientes"];

  const esperado = {
    "Productos": ["id","nombre","tamano","precio","categoria","destacado","emoji","descripcion","imagen"],
    "Pedidos":   ["fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
                  "casa","conjunto","nota","pago","zona_envio","costo_envio","subtotal","total",
                  "estado_pago","productos"],
    "Clientes":  ["primera_compra","ultima_compra","nombre","telefono","ciudad",
                  "barrio","direccion","total_pedidos","total_gastado","tipo"],
  };

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) { Logger.log("FALTA la hoja: " + nombre); return; }

    const actuales = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const esp      = esperado[nombre];
    let ok = true;

    esp.forEach((col, i) => {
      if (actuales[i] !== col) {
        Logger.log("ERROR en " + nombre + " col " + (i+1) +
                   ": esperado='" + col + "' actual='" + actuales[i] + "'");
        ok = false;
      }
    });

    if (ok) {
      Logger.log("OK: " + nombre + " (" + actuales.length + " columnas correctas)");
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   CALIFICACIONES
══════════════════════════════════════════════════════════════ */
function guardarCalificacion(ss, body) {
  let sheet = ss.getSheetByName("Calificaciones");
  if (!sheet) {
    sheet = ss.insertSheet("Calificaciones");
    const h = ["fecha","nombre","telefono","estrellas","comentario"];
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setFontWeight("bold").setBackground("#F59E0B").setFontColor("#fff");
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date().toLocaleString("es-CO"),
    body.nombre    || "",
    body.telefono  || "",
    body.estrellas || 0,
    body.comentario|| "",
  ]);
}

/* ══════════════════════════════════════════════════════════════
   CUPONES — incrementar uso
══════════════════════════════════════════════════════════════ */
function incrementarUsoCupon(ss, code) {
  const sheet = ss.getSheetByName("Cupones");
  if (!sheet) return;
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const COL     = {};
  headers.forEach((h, i) => COL[h] = i + 1);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL["codigo"] - 1]).toUpperCase() === code.toUpperCase()) {
      const cell = sheet.getRange(i + 1, COL["usos_actuales"]);
      cell.setValue((Number(cell.getValue()) || 0) + 1);
      break;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   NOTIFICACIÓN EMAIL al recibir pedido
══════════════════════════════════════════════════════════════ */
function notificarPedido(body) {
  try {
    const email   = Session.getActiveUser().getEmail();
    if (!email) return;
    const subject = "🧴 Nuevo pedido Limpieza RR — " + (body.nombre || "cliente");
    const total   = body.total !== undefined ? "$ " + Number(body.total).toLocaleString("es-CO") : "A convenir";
    const html    = "<h2 style='color:#0D9488'>🛒 Nuevo Pedido Recibido</h2>" +
      "<table style='border-collapse:collapse;width:100%;font-family:sans-serif'>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Cliente</td><td style='padding:8px'>" + (body.nombre||"") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Teléfono</td><td style='padding:8px'>" + (body.telefono||"") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Dirección</td><td style='padding:8px'>" + (body.barrio||"") + " — " + (body.direccion||"") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Pago</td><td style='padding:8px'>" + (body.pago||"") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Envío</td><td style='padding:8px'>" + (body.zona_envio||"") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Total</td><td style='padding:8px;color:#0D9488;font-weight:bold'>" + total + "</td></tr>" +
      "</table>" +
      "<h3 style='color:#0F766E;margin-top:20px'>Productos:</h3>" +
      "<pre style='background:#F0FDF9;padding:12px;border-radius:8px'>" + (body.productos||"") + "</pre>";
    MailApp.sendEmail({ to: email, subject, htmlBody: html });
  } catch (err) {
    Logger.log("Error enviando email: " + err.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD — Hoja "Resumen" que se actualiza automáticamente
══════════════════════════════════════════════════════════════ */
// ── Dashboard y cupones están en LIMPIEZARR_Dashboard.gs ──