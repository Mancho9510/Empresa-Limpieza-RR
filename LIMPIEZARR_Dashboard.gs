/* ══════════════════════════════════════════════════════════════
   LIMPIEZA RR — Dashboard, Cupones, Calificaciones, Email
   Archivo: LIMPIEZARR_Dashboard.gs

   FUNCIONES PRINCIPALES:
   - refrescarDashboard()  Ejecutar manualmente para ver metricas
   - inicializarCupones()  Ejecutar una vez para crear hoja Cupones
   - setupCompleto()       Ejecutar una vez al iniciar
══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
   REFRESCAR DASHBOARD — ejecutar manualmente
────────────────────────────────────────────────────────────── */
function refrescarDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("ERROR: No se encontro el spreadsheet. Asegurate de ejecutar desde el editor del Sheet.");
    return;
  }
  Logger.log("Spreadsheet encontrado: " + ss.getName());
  actualizarDashboard(ss);
  Logger.log("Dashboard actualizado correctamente.");
}

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR DASHBOARD
────────────────────────────────────────────────────────────── */
function actualizarDashboard(ss) {
  try {
    if (!ss) {
      Logger.log("ERROR en actualizarDashboard: ss es null o undefined");
      return;
    }
    Logger.log("Actualizando dashboard en: " + ss.getName());
    var dash = ss.getSheetByName("Resumen");
    if (!dash) {
      dash = ss.insertSheet("Resumen");
      ss.setActiveSheet(dash);
      ss.moveActiveSheet(1);
    }
    dash.clearContents();

    var pedidos  = ss.getSheetByName("Pedidos");
    var clientes = ss.getSheetByName("Clientes");
    var califs   = ss.getSheetByName("Calificaciones");
    if (!pedidos) { Logger.log("Hoja Pedidos no encontrada"); return; }

    var pData    = pedidos.getDataRange().getValues();
    var pHeaders = pData[0];
    var PC = {};
    pHeaders.forEach(function(h, i) { PC[String(h).toLowerCase().trim()] = i; });
    var rows = pData.slice(1).filter(function(r) { return r[0] !== "" && r[0] !== null; });
    Logger.log("Pedidos encontrados: " + rows.length);

    var hoy     = new Date();
    var hoyDia  = Number(Utilities.formatDate(hoy, "America/Bogota", "d"));
    var hoyMes  = Number(Utilities.formatDate(hoy, "America/Bogota", "M"));
    var hoyAnio = Number(Utilities.formatDate(hoy, "America/Bogota", "yyyy"));

    var totalHoy = 0, countHoy = 0;
    var totalMes = 0, countMes = 0;
    var totalGeneral = 0, pendientes = 0;
    var prodCount = {};

    rows.forEach(function(r) {
      var rawFecha = r[PC["fecha"]];
      var total    = Number(r[PC["total"]]) || 0;
      var estado   = String(r[PC["estado_pago"]] || "").toUpperCase();
      var prods    = String(r[PC["productos"]]   || "");

      totalGeneral += total;
      if (estado === "PENDIENTE" || estado === "") pendientes++;

      try {
        var fd = (rawFecha instanceof Date) ? rawFecha : new Date(String(rawFecha));
        if (!isNaN(fd.getTime())) {
          var fD = Number(Utilities.formatDate(fd, "America/Bogota", "d"));
          var fM = Number(Utilities.formatDate(fd, "America/Bogota", "M"));
          var fA = Number(Utilities.formatDate(fd, "America/Bogota", "yyyy"));
          if (fD === hoyDia && fM === hoyMes && fA === hoyAnio) { totalHoy += total; countHoy++; }
          if (fM === hoyMes && fA === hoyAnio)                   { totalMes += total; countMes++; }
        }
      } catch(e) {}

      prods.split("\n").forEach(function(line) {
        var partes = line.split("|");
        if (partes.length > 0) {
          var k = partes[0].trim();
          if (k !== "") prodCount[k] = (prodCount[k] || 0) + 1;
        }
      });
    });

    var topProd = Object.keys(prodCount)
      .map(function(k) { return [k, prodCount[k]]; })
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 5);

    var numClientes = clientes ? Math.max(0, clientes.getLastRow() - 1) : 0;
    var vip = 0;
    if (clientes && clientes.getLastRow() > 1) {
      var clData   = clientes.getDataRange().getValues();
      var clHdr    = clData[0].map(function(h) { return String(h).toLowerCase(); });
      var tipoIdx  = clHdr.indexOf("tipo");
      if (tipoIdx >= 0) {
        clData.slice(1).forEach(function(r) {
          if (String(r[tipoIdx]).toUpperCase().indexOf("VIP") >= 0) vip++;
        });
      }
    }

    var avgRating = "Sin resenas aun";
    if (califs && califs.getLastRow() > 1) {
      var cData   = califs.getDataRange().getValues();
      var cHdr    = cData[0].map(function(h) { return String(h).toLowerCase(); });
      var starIdx = cHdr.indexOf("estrellas");
      if (starIdx >= 0) {
        var stars = cData.slice(1)
          .map(function(r) { return Number(r[starIdx]); })
          .filter(function(v) { return v > 0; });
        if (stars.length > 0) {
          var suma = stars.reduce(function(a, b) { return a + b; }, 0);
          avgRating = (suma / stars.length).toFixed(1) + " / 5  (" + stars.length + " resenas)";
        }
      }
    }

    var fechaStr = Utilities.formatDate(hoy, "America/Bogota", "dd/MM/yyyy HH:mm");

    var data = [
      ["LIMPIEZA RR - Dashboard", "", "Actualizado: " + fechaStr],
      ["","",""],
      ["HOY", "Pedidos: " + countHoy, "Ventas: $" + totalHoy.toLocaleString()],
      ["ESTE MES", "Pedidos: " + countMes, "Ventas: $" + totalMes.toLocaleString()],
      ["","",""],
      ["GENERAL", "", ""],
      ["Total pedidos", rows.length, ""],
      ["Ventas totales", totalGeneral, ""],
      ["Pendientes de pago", pendientes, ""],
      ["","",""],
      ["CLIENTES", "", ""],
      ["Total clientes", numClientes, ""],
      ["Clientes VIP", vip, ""],
      ["Calificacion promedio", avgRating, ""],
      ["","",""],
      ["TOP 5 PRODUCTOS", "Veces pedido", ""],
    ];

    topProd.forEach(function(item) {
      data.push([String(item[0]), Number(item[1]), ""]);
    });
    // Si no hay productos aun
    if (topProd.length === 0) {
      data.push(["Sin pedidos aun", "", ""]);
    }

    dash.getRange(1, 1, data.length, 3).setValues(data);

    // Estilo titulo
    dash.getRange(1, 1, 1, 3)
      .merge()
      .setBackground("#0D9488")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setFontSize(13)
      .setHorizontalAlignment("center");
    dash.setRowHeight(1, 38);

    // Secciones en verde
    [3, 4, 6, 11, 16].forEach(function(fila) {
      try {
        dash.getRange(fila, 1, 1, 3)
          .setFontWeight("bold")
          .setBackground("#CCFBF1")
          .setFontColor("#0F766E");
      } catch(e) {}
    });

    // Fondo alternado
    for (var r = 2; r <= data.length; r++) {
      dash.getRange(r, 1, 1, 3).setBackground(r % 2 === 0 ? "#F0FDF9" : "#FFFFFF");
    }

    // Re-aplicar secciones encima del alternado
    [3, 4, 6, 11, 16].forEach(function(fila) {
      try {
        dash.getRange(fila, 1, 1, 3)
          .setFontWeight("bold")
          .setBackground("#CCFBF1")
          .setFontColor("#0F766E");
      } catch(e) {}
    });

    // Formato moneda ventas totales
    try { dash.getRange(8, 2).setNumberFormat("$ #,##0"); } catch(e) {}

    dash.autoResizeColumns(1, 3);
    dash.setFrozenRows(1);
    Logger.log("Dashboard OK: " + rows.length + " pedidos, $" + totalGeneral + " total.");

  } catch(err) {
    Logger.log("Error dashboard: " + err.message);
  }
}

/* ──────────────────────────────────────────────────────────────
   NOTIFICACION EMAIL al recibir pedido
────────────────────────────────────────────────────────────── */
function notificarPedido(body) {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return;
    var total   = body.total ? "$ " + Number(body.total).toLocaleString("es-CO") : "A convenir";
    var subject = "Nuevo pedido Limpieza RR - " + (body.nombre || "cliente");
    var html =
      "<h2 style='color:#0D9488'>Nuevo Pedido Recibido</h2>" +
      "<table style='border-collapse:collapse;width:100%;font-family:sans-serif'>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Cliente</td>" +
        "<td style='padding:8px'>"   + (body.nombre     || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Telefono</td>" +
        "<td style='padding:8px'>"  + (body.telefono   || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Direccion</td>" +
        "<td style='padding:8px'>" + (body.barrio || "") + " - " + (body.direccion || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Pago</td>" +
        "<td style='padding:8px'>"  + (body.pago       || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Zona envio</td>" +
        "<td style='padding:8px'>"  + (body.zona_envio || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Total</td>" +
        "<td style='padding:8px;color:#0D9488;font-weight:bold'>" + total + "</td></tr>" +
      "</table>" +
      "<h3 style='color:#0F766E;margin-top:20px'>Productos:</h3>" +
      "<pre style='background:#F0FDF9;padding:12px;border-radius:8px'>" +
        (body.productos || "") + "</pre>";
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html });
  } catch(err) {
    Logger.log("Error email: " + err.message);
  }
}

/* ──────────────────────────────────────────────────────────────
   CUPONES — validar codigo
────────────────────────────────────────────────────────────── */
function validarCupon(code) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Cupones");
  if (!sheet) return null;
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var COL     = {};
  headers.forEach(function(h, i) { COL[h] = i; });
  var found = null;
  data.slice(1).forEach(function(r) {
    if (String(r[COL["codigo"]] || "").toUpperCase() === code.toUpperCase()) found = r;
  });
  if (!found) return null;
  var activo  = String(found[COL["activo"]]).toLowerCase() === "true";
  var uses    = Number(found[COL["usos_actuales"]]) || 0;
  var maxUses = (found[COL["usos_maximos"]] !== "") ? Number(found[COL["usos_maximos"]]) : Infinity;
  var expiry  = found[COL["vencimiento"]];
  if (!activo)                               return null;
  if (uses >= maxUses)                       return null;
  if (expiry && new Date(expiry) < new Date()) return null;
  return {
    type:  String(found[COL["tipo"]]        || "pct"),
    value: Number(found[COL["valor"]]       || 0),
    label: String(found[COL["descripcion"]] || code),
  };
}

/* ──────────────────────────────────────────────────────────────
   CUPONES — incrementar uso
────────────────────────────────────────────────────────────── */
function incrementarUsoCupon(ss, code) {
  if (!code) return;
  var sheet = ss.getSheetByName("Cupones");
  if (!sheet) return;
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var COL     = {};
  headers.forEach(function(h, i) { COL[h] = i + 1; });
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL["codigo"] - 1]).toUpperCase() === code.toUpperCase()) {
      var cell = sheet.getRange(i + 1, COL["usos_actuales"]);
      cell.setValue((Number(cell.getValue()) || 0) + 1);
      break;
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   CALIFICACIONES — guardar
────────────────────────────────────────────────────────────── */
function guardarCalificacion(ss, body) {
  var sheet = ss.getSheetByName("Calificaciones");
  if (!sheet) {
    sheet = ss.insertSheet("Calificaciones");
    var h = ["fecha", "nombre", "telefono", "estrellas", "comentario"];
    sheet.appendRow(h);
    sheet.getRange(1, 1, 1, h.length)
      .setFontWeight("bold").setBackground("#F59E0B").setFontColor("#fff");
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date().toLocaleString("es-CO"),
    body.nombre     || "",
    body.telefono   || "",
    body.estrellas  || 0,
    body.comentario || "",
  ]);
}

/* ──────────────────────────────────────────────────────────────
   INICIALIZAR CUPONES — ejecutar una vez
────────────────────────────────────────────────────────────── */
function inicializarCupones() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Cupones");
  if (!sheet) sheet = ss.insertSheet("Cupones");
  if (sheet.getLastRow() === 0) {
    var h = ["codigo","descripcion","tipo","valor","usos_maximos","usos_actuales","vencimiento","activo"];
    sheet.appendRow(h);
    sheet.getRange(1, 1, 1, h.length).setFontWeight("bold").setBackground("#F59E0B").setFontColor("#fff");
    sheet.appendRow(["BIENVENIDO", "10% descuento bienvenida", "pct",   10,   "", 0, "", true]);
    sheet.appendRow(["PROMO5K",    "Descuento fijo $5.000",    "fixed", 5000, 100, 0, "", true]);
    sheet.appendRow(["VIP20",      "20% clientes VIP",         "pct",   20,   50,  0, "", true]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, h.length);
  }
  Logger.log("OK: hoja Cupones lista.");
}

/* ──────────────────────────────────────────────────────────────
   SETUP COMPLETO v2
────────────────────────────────────────────────────────────── */
function setupCompleto() {
  inicializarCupones();
  actualizarDashboard(SpreadsheetApp.getActiveSpreadsheet());
  Logger.log("=== Setup v2 completo: Cupones + Dashboard ===");
}