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
    guardarPedido(ss, body);
    if (body.telefono) upsertCliente(ss, body);
    if (body.cupon) incrementarUsoCupon(ss, body.cupon);
    notificarPedido(body);
    actualizarDashboard(ss);
    return jsonResponse({ ok: true });
  } catch (err) {
    Logger.log("Error doPost: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
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