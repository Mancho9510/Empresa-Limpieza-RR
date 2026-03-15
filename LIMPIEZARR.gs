/**
 * ═══════════════════════════════════════════════════════════════
 *  LIMPIEZA RR — Google Apps Script v2
 *
 *  NOVEDADES v2:
 *  ✅ Columna "imagen" en Productos (URL Google Drive o externa)
 *  ✅ Columna "telefono" en Pedidos
 *  ✅ Hoja "Clientes" con deduplicación automática por teléfono
 *  ✅ Historial por cliente: conteo de pedidos + total acumulado
 *  ✅ Clasificación automática: Nuevo / Recurrente / VIP
 *
 *  SETUP (ejecutar UNA sola vez):
 *  → configuracionInicial()  crea las 3 hojas listas
 * ═══════════════════════════════════════════════════════════════
 */

// Helper seguro para obtener el spreadsheet activo
function getSS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No hay spreadsheet activo. Ejecuta desde el editor del Sheet.");
  return ss;
}

/* ──────────────────────────────────────────────────────────────
   GET — lee datos para la web
────────────────────────────────────────────────────────────── */
function doGet(e) {
  try {
    var action = e.parameter.action || "";
    var ss     = SpreadsheetApp.getActiveSpreadsheet();

    // ── Productos ──────────────────────────────────────────
    if (action === "productos") {
      var sheet   = ss.getSheetByName("Productos");
      if (!sheet) return jsonResponse({ ok: false, error: "Hoja Productos no encontrada" });
      var data    = sheet.getDataRange().getValues();
      var headers = data[0];
      var rows    = data.slice(1)
        .filter(function(row) { return row[0] !== "" && row[0] !== null; })
        .map(function(row) {
          var obj = {};
          headers.forEach(function(h, i) { obj[String(h).trim()] = row[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, data: rows });
    }

    // ── Cupón ──────────────────────────────────────────────
    if (action === "cupon") {
      var code    = (e.parameter.code || "").toUpperCase().trim();
      var cSheet  = ss.getSheetByName("Cupones");
      if (!cSheet) return jsonResponse({ ok: false, cupon: null });
      var cData   = cSheet.getDataRange().getValues();
      var cHdr    = cData[0];
      var COL     = {};
      cHdr.forEach(function(h, i) { COL[String(h).toLowerCase().trim()] = i; });
      var found   = null;
      cData.slice(1).forEach(function(r) {
        if (String(r[COL["codigo"]] || "").toUpperCase() === code) found = r;
      });
      if (!found) return jsonResponse({ ok: false, cupon: null });
      var activo  = String(found[COL["activo"]]).toLowerCase() === "true";
      var uses    = Number(found[COL["usos_actuales"]]) || 0;
      var maxU    = found[COL["usos_maximos"]] !== "" ? Number(found[COL["usos_maximos"]]) : Infinity;
      var expiry  = found[COL["vencimiento"]];
      if (!activo)                                  return jsonResponse({ ok: false, cupon: null });
      if (uses >= maxU)                             return jsonResponse({ ok: false, cupon: null });
      if (expiry && new Date(expiry) < new Date())  return jsonResponse({ ok: false, cupon: null });
      return jsonResponse({
        ok: true,
        cupon: {
          type:  String(found[COL["tipo"]]        || "pct"),
          value: Number(found[COL["valor"]]        || 0),
          label: String(found[COL["descripcion"]]  || code),
        }
      });
    }

    // ── Historial ──────────────────────────────────────────
    if (action === "historial") {
      var tel    = String(e.parameter.telefono || "").replace(/[^0-9]/g, "");
      var pSheet = ss.getSheetByName("Pedidos");
      if (!pSheet || !tel) return jsonResponse({ ok: false, pedidos: [] });
      var pData    = pSheet.getDataRange().getValues();
      var pHdr     = pData[0];
      var pCOL     = {};
      pHdr.forEach(function(h, i) { pCOL[String(h).toLowerCase().trim()] = i; });
      var pedidos  = pData.slice(1)
        .filter(function(r) {
          return String(r[pCOL["telefono"]] || "").replace(/[^0-9]/g, "") === tel;
        })
        .slice(-10).reverse()
        .map(function(r) {
          var obj = {};
          pHdr.forEach(function(h, i) { obj[String(h).trim()] = r[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, pedidos: pedidos });
    }

    // ── Estado ─────────────────────────────────────────────
    if (action === "estado") {
      var tel2   = String(e.parameter.telefono || "").replace(/[^0-9]/g, "");
      var eSheet = ss.getSheetByName("Pedidos");
      if (!eSheet || !tel2) return jsonResponse({ ok: false, pedidos: [] });
      var eData    = eSheet.getDataRange().getValues();
      var eHdr     = eData[0];
      var eCOL     = {};
      eHdr.forEach(function(h, i) { eCOL[String(h).toLowerCase().trim()] = i; });
      var ultimos  = eData.slice(1)
        .filter(function(r) {
          return String(r[eCOL["telefono"]] || "").replace(/[^0-9]/g, "") === tel2;
        })
        .slice(-3).reverse()
        .map(function(r) {
          var obj = {};
          eHdr.forEach(function(h, i) { obj[String(h).trim()] = r[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, pedidos: ultimos });
    }

    // ── Admin: listar productos con stock ─────────────────
    if (action === "admin_productos") {
      var clave = e.parameter.clave || "";
      if (clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      var pSheet = ss.getSheetByName("Productos");
      if (!pSheet) return jsonResponse({ ok: false, productos: [] });
      var pData = pSheet.getDataRange().getValues();
      var pHdr  = pData[0];
      var pRows = pData.slice(1)
        .filter(function(r) { return r[0] !== "" && r[0] !== null; })
        .map(function(r, idx) {
          var obj = { fila: idx + 2 };
          pHdr.forEach(function(h, i) { obj[String(h).toLowerCase().trim()] = r[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, productos: pRows });
    }

    // ── Admin: listar pedidos recientes ───────────────────
    if (action === "admin_pedidos") {
      var clave = e.parameter.clave || "";
      if (clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      var aSheet = ss.getSheetByName("Pedidos");
      if (!aSheet) return jsonResponse({ ok: false, pedidos: [] });
      var aData = aSheet.getDataRange().getValues();
      var aHdr  = aData[0];
      var aCOL  = {};
      aHdr.forEach(function(h, i) { aCOL[String(h).toLowerCase().trim()] = i; });
      var todos = aData.slice(1)
        .filter(function(r) { return r[0] !== "" && r[0] !== null; })
        .map(function(r, idx) {
          return {
            fila:        idx + 2,
            fecha:       String(r[aCOL["fecha"]]       || ""),
            nombre:      String(r[aCOL["nombre"]]      || ""),
            telefono:    String(r[aCOL["telefono"]]    || ""),
            barrio:      String(r[aCOL["barrio"]]      || ""),
            pago:        String(r[aCOL["pago"]]        || ""),
            total:       Number(r[aCOL["total"]])       || 0,
            estado_pago: String(r[aCOL["estado_pago"]] || "PENDIENTE"),
            estado_envio:String(r[aCOL["estado_envio"]]|| "Recibido"),
            productos:   String(r[aCOL["productos"]]   || ""),
          };
        })
        .reverse() // más recientes primero
        .slice(0, 50); // últimos 50
      return jsonResponse({ ok: true, pedidos: todos });
    }

    return jsonResponse({ ok: false, error: "Accion no reconocida: " + action });

  } catch(err) {
    Logger.log("Error en doGet: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

/* ──────────────────────────────────────────────────────────────
   POST — guarda pedido y actualiza cliente
────────────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    if (body.accion === "calificacion") {
      guardarCalificacion(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_estado") {
      var clave = body.clave || "";
      if (clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarEstadoPedido(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_stock") {
      var claveS = body.clave || "";
      if (claveS !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarStockProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    guardarPedido(ss, body);
    if (body.telefono) upsertCliente(ss, body);
    if (body.cupon) incrementarUsoCupon(ss, body.cupon);
    // Descontar stock de los productos pedidos
    descontarStock(ss, body.productos);
    // Notificar y actualizar dashboard en bloque separado
    // para que un error aquí no afecte la respuesta al cliente
    try { notificarPedido(body); } catch(e2) { Logger.log("Email fallido: " + e2.message); }
    try { actualizarDashboard(ss); } catch(e3) { Logger.log("Dashboard fallido: " + e3.message); }
    return jsonResponse({ ok: true });
  } catch (err) {
    Logger.log("Error doPost: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

/* ──────────────────────────────────────────────────────────────
   DESCONTAR STOCK — se llama al recibir cada pedido
   Parsea la cadena de productos y reduce el stock en la hoja
────────────────────────────────────────────────────────────── */
function descontarStock(ss, productosStr) {
  if (!productosStr) return;
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) return;

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var nomIdx  = headers.indexOf("nombre");
  var tamIdx  = headers.indexOf("tamano");
  var stkIdx  = headers.indexOf("stock");
  if (stkIdx < 0) return;

  var alertas = []; // productos que llegaron a stock bajo o 0

  var lineas = String(productosStr).split("\n")
    .filter(function(l) { return l.trim() !== ""; });

  lineas.forEach(function(linea) {
    var cantMatch = linea.match(/Cant[^0-9]*([0-9]+)/i);
    if (!cantMatch) return;
    var cant   = parseInt(cantMatch[1], 10);
    var partes = linea.split("|");
    var nomTam = partes[0].trim();

    for (var i = 1; i < data.length; i++) {
      var nombre = String(data[i][nomIdx] || "").trim();
      var tamano = String(data[i][tamIdx] || "").trim();
      var clave  = (nombre + " " + tamano).trim();
      if (clave.toLowerCase() === nomTam.toLowerCase()) {
        var stockActual = data[i][stkIdx];
        if (stockActual !== "" && stockActual !== null && !isNaN(Number(stockActual))) {
          var nuevoStock = Math.max(0, Number(stockActual) - cant);
          sheet.getRange(i + 1, stkIdx + 1).setValue(nuevoStock);
          Logger.log("Stock: " + clave + " " + stockActual + " → " + nuevoStock);
          // Resaltar celda visualmente en el Sheet
          var cell = sheet.getRange(i + 1, stkIdx + 1);
          if (nuevoStock === 0) {
            cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
            alertas.push({ nombre: clave, stock: 0, nivel: "AGOTADO" });
          } else if (nuevoStock <= 5) {
            cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
            alertas.push({ nombre: clave, stock: nuevoStock, nivel: "BAJO" });
          } else {
            cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("normal");
          }
        }
        break;
      }
    }
  });

  // Enviar alerta si hay productos agotados o con stock bajo
  if (alertas.length > 0) {
    try { alertarStock(alertas); } catch(e) { Logger.log("Error alerta stock: " + e.message); }
  }
}

/* ──────────────────────────────────────────────────────────────
   ALERTA DE STOCK — envía email cuando un producto se agota
────────────────────────────────────────────────────────────── */
function alertarStock(alertas) {
  var email = Session.getActiveUser().getEmail();
  if (!email) return;

  var agotados = alertas.filter(function(a) { return a.nivel === "AGOTADO"; });
  var bajos    = alertas.filter(function(a) { return a.nivel === "BAJO"; });

  var subject = "⚠️ Alerta de Stock — Limpieza RR";
  if (agotados.length > 0) subject = "🚨 AGOTADO — " + agotados[0].nombre + " | Limpieza RR";

  var html = "<h2 style='color:#991B1B;font-family:sans-serif'>⚠️ Alerta de Inventario — Limpieza RR</h2>";

  if (agotados.length > 0) {
    html += "<h3 style='color:#991B1B'>🚨 Productos AGOTADOS</h3>";
    html += "<table style='border-collapse:collapse;width:100%;font-family:sans-serif'>";
    html += "<tr style='background:#FEE2E2'><th style='padding:10px;text-align:left'>Producto</th><th style='padding:10px'>Stock</th></tr>";
    agotados.forEach(function(a) {
      html += "<tr><td style='padding:8px;border-bottom:1px solid #eee'>" + a.nombre +
              "</td><td style='padding:8px;text-align:center;color:#991B1B;font-weight:bold'>AGOTADO</td></tr>";
    });
    html += "</table>";
  }

  if (bajos.length > 0) {
    html += "<h3 style='color:#854D0E;margin-top:20px'>⚠️ Productos con Stock Bajo (≤ 5 unidades)</h3>";
    html += "<table style='border-collapse:collapse;width:100%;font-family:sans-serif'>";
    html += "<tr style='background:#FEF9C3'><th style='padding:10px;text-align:left'>Producto</th><th style='padding:10px'>Unidades restantes</th></tr>";
    bajos.forEach(function(a) {
      html += "<tr><td style='padding:8px;border-bottom:1px solid #eee'>" + a.nombre +
              "</td><td style='padding:8px;text-align:center;color:#854D0E;font-weight:bold'>" + a.stock + "</td></tr>";
    });
    html += "</table>";
  }

  html += "<p style='color:#64748B;font-size:12px;margin-top:24px;font-family:sans-serif'>" +
          "Actualiza el inventario en la hoja <strong>Productos</strong> del Google Sheet.</p>";

  MailApp.sendEmail({ to: email, subject: subject, htmlBody: html });
  Logger.log("Alerta de stock enviada: " + alertas.length + " productos.");
}

/* ──────────────────────────────────────────────────────────────
   VERIFICAR STOCK MANUALMENTE — ejecutar para revisar toda la hoja
   Envía un reporte de todos los productos con stock bajo o agotado
────────────────────────────────────────────────────────────── */
function verificarStockCompleto() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var nomIdx  = headers.indexOf("nombre");
  var tamIdx  = headers.indexOf("tamano");
  var stkIdx  = headers.indexOf("stock");
  if (stkIdx < 0) { Logger.log("Columna stock no encontrada"); return; }

  var alertas = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][nomIdx]) continue;
    var stockVal = data[i][stkIdx];
    if (stockVal === "" || stockVal === null) continue;
    var stockNum = Number(stockVal);
    if (isNaN(stockNum)) continue;
    var nombre = String(data[i][nomIdx] || "").trim();
    var tamano = String(data[i][tamIdx] || "").trim();
    var clave  = (nombre + " " + tamano).trim();
    if (stockNum === 0)      alertas.push({ nombre: clave, stock: 0,       nivel: "AGOTADO" });
    else if (stockNum <= 5)  alertas.push({ nombre: clave, stock: stockNum, nivel: "BAJO" });
  }

  if (alertas.length === 0) {
    Logger.log("✅ Todo el inventario está en orden. Sin alertas.");
  } else {
    Logger.log("⚠️ Productos con alerta: " + alertas.length);
    alertas.forEach(function(a) { Logger.log("  " + a.nivel + ": " + a.nombre + " = " + a.stock); });
    try { alertarStock(alertas); } catch(e) { Logger.log("Error email: " + e.message); }
  }
}

/* ──────────────────────────────────────────────────────────────
   GUARDAR PEDIDO en hoja "Pedidos"
────────────────────────────────────────────────────────────── */
function guardarPedido(ss, body) {
  const sheet = ss.getSheetByName("Pedidos");
  sheet.appendRow([
    new Date().toLocaleString("es-CO"),
    body.nombre        || "",
    body.telefono      || "",
    body.ciudad        || "",
    body.departamento  || "",
    body.barrio        || "",
    body.direccion     || "",
    body.casa          || "",
    body.conjunto      || "",
    body.nota          || "",
    body.cupon         || "",
    body.descuento     || 0,
    body.pago          || "",
    body.zona_envio    || "",
    body.costo_envio   || 0,
    body.subtotal      || 0,
    body.total         || 0,
    body.estado_pago   || "PENDIENTE",
    "Recibido",
    body.productos     || "",
  ]);
}

/* ──────────────────────────────────────────────────────────────
   UPSERT CLIENTE en hoja "Clientes"
   - Si el telefono existe: actualiza ultima_compra, direccion, contadores
   - Si no existe: crea fila nueva
────────────────────────────────────────────────────────────── */
function upsertCliente(ss, body) {
  const sheet = ss.getSheetByName("Clientes");
  if (!sheet) return;

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const COL     = {};
  headers.forEach((h, i) => COL[h] = i + 1); // base-1 para getRange

  const tel          = String(body.telefono || "").replace(/\D/g, "");
  const totalPedido  = Number(body.total) || 0;
  const fecha        = new Date().toLocaleString("es-CO");

  // Buscar por telefono
  let clienteRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL["telefono"] - 1]).replace(/\D/g, "") === tel && tel !== "") {
      clienteRow = i + 1;
      break;
    }
  }

  if (clienteRow === -1) {
    // NUEVO CLIENTE
    sheet.appendRow([
      fecha,                               // primera_compra
      fecha,                               // ultima_compra
      body.nombre    || "",                // nombre
      tel,                                 // telefono
      body.ciudad    || "Bogota",          // ciudad
      body.barrio    || "",                // barrio
      body.direccion || "",                // direccion
      1,                                   // total_pedidos
      totalPedido,                         // total_gastado
      clasificarCliente(1, totalPedido),   // tipo
    ]);
  } else {
    // CLIENTE EXISTENTE — actualizar
    const fila         = data[clienteRow - 1];
    const pedidosAnt   = Number(fila[COL["total_pedidos"] - 1]) || 0;
    const gastadoAnt   = Number(fila[COL["total_gastado"] - 1]) || 0;
    const nuevoPedidos = pedidosAnt + 1;
    const nuevoGastado = gastadoAnt + totalPedido;

    sheet.getRange(clienteRow, COL["ultima_compra"]).setValue(fecha);
    sheet.getRange(clienteRow, COL["nombre"]).setValue(body.nombre || fila[COL["nombre"] - 1]);
    sheet.getRange(clienteRow, COL["ciudad"]).setValue(body.ciudad || fila[COL["ciudad"] - 1]);
    sheet.getRange(clienteRow, COL["barrio"]).setValue(body.barrio || fila[COL["barrio"] - 1]);
    sheet.getRange(clienteRow, COL["direccion"]).setValue(body.direccion || fila[COL["direccion"] - 1]);
    sheet.getRange(clienteRow, COL["total_pedidos"]).setValue(nuevoPedidos);
    sheet.getRange(clienteRow, COL["total_gastado"]).setValue(nuevoGastado);
    sheet.getRange(clienteRow, COL["tipo"]).setValue(clasificarCliente(nuevoPedidos, nuevoGastado));
  }
}

/* ──────────────────────────────────────────────────────────────
   CLASIFICACION AUTOMÁTICA
────────────────────────────────────────────────────────────── */
function clasificarCliente(pedidos, gastado) {
  if (pedidos >= 10 || gastado >= 500000) return "VIP";
  if (pedidos >= 3  || gastado >= 150000) return "Recurrente";
  if (pedidos >= 2)                        return "Recurrente";
  return "Nuevo";
}

/* ──────────────────────────────────────────────────────────────
   HELPER
────────────────────────────────────────────────────────────── */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════════════════════════════════════════════
   CONFIGURACION INICIAL — ejecutar UNA sola vez
══════════════════════════════════════════════════════════════ */
function configuracionInicial() {
  populateProductos();
  inicializarPedidos();
  inicializarClientes();
  Logger.log(
    "=== CONFIGURACION COMPLETA ===\n" +
    "- Productos: OK (columna imagen en amarillo)\n" +
    "- Pedidos: OK\n" +
    "- Clientes: OK (clasificacion automatica)"
  );
}

/* ──────────────────────────────────────────────────────────────
   POBLAR PRODUCTOS
────────────────────────────────────────────────────────────── */
// ── Las funciones de configuración están en LIMPIEZARR_Setup.gs ──
/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR ESTADO DE PEDIDO — llamado desde el panel admin
   body: { accion, clave, fila, estado_envio, estado_pago }
────────────────────────────────────────────────────────────── */
function actualizarEstadoPedido(ss, body) {
  var sheet = ss.getSheetByName("Pedidos");
  if (!sheet) return;

  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var COL = {};
  headers.forEach(function(h, i) { COL[String(h).toLowerCase().trim()] = i + 1; });

  if (body.estado_envio && COL["estado_envio"]) {
    sheet.getRange(fila, COL["estado_envio"]).setValue(body.estado_envio);
  }
  if (body.estado_pago && COL["estado_pago"]) {
    sheet.getRange(fila, COL["estado_pago"]).setValue(body.estado_pago);
    // Actualizar color del estado_pago
    var cell = sheet.getRange(fila, COL["estado_pago"]);
    var val  = String(body.estado_pago).toUpperCase();
    if (val === "PAGADO") {
      cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    } else if (val === "CONTRA ENTREGA") {
      cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
    } else {
      cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
    }
  }
  Logger.log("Estado actualizado fila " + fila + ": " + JSON.stringify({
    estado_envio: body.estado_envio, estado_pago: body.estado_pago
  }));
}

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR STOCK DESDE ADMIN
   body: { accion, clave, fila, stock }
────────────────────────────────────────────────────────────── */
function actualizarStockProducto(ss, body) {
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) return;
  var fila  = parseInt(body.fila, 10);
  if (!fila || fila < 2) return;
  var headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var stkCol   = headers.map(function(h){ return String(h).toLowerCase().trim(); }).indexOf("stock") + 1;
  if (!stkCol) return;
  var nuevoStock = body.stock === "" ? "" : Number(body.stock);
  sheet.getRange(fila, stkCol).setValue(nuevoStock);
  // Colorear celda
  var cell = sheet.getRange(fila, stkCol);
  if (nuevoStock === "" || nuevoStock === null) {
    cell.setBackground("#FFFFFF").setFontColor("#0F172A").setFontWeight("normal");
  } else if (Number(nuevoStock) === 0) {
    cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  } else if (Number(nuevoStock) <= 5) {
    cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
  } else {
    cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("normal");
  }
  Logger.log("Stock actualizado fila " + fila + " = " + nuevoStock);
}