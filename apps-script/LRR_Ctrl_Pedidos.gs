/* ──────────────────────────────────────────────────────────────
   LRR_Ctrl_Pedidos.gs
   Controlador para Pedidos (Historial, Nuevo Pedido, WA, Estados)
────────────────────────────────────────────────────────────── */

var CONFIG_WA = {
  NUMERO:  "573503443140",
  API_KEY: "4942289",     // Pega aquí SOLO el número de key de CallMeBot (ej: "4942289")
  ACTIVO:  true,
};

function doGet_historial(e, ss) {
  var tel    = normalizarTelefono(e.parameter.telefono || "");
  var _s = leerSheet(ss, "Pedidos");
  if (!_s.sheet || !tel) return jsonResponse({ ok: false, pedidos: [] });
  var pCOL  = {};
  _s.headers.forEach(function(h, i) { pCOL[h] = i; });
  var pedidos = _s.rows
    .filter(function(r) { return normalizarTelefono(r[pCOL["telefono"]] || "") === tel; })
    .slice(-10).reverse()
    .map(function(r) {
      var obj = {};
      _s.headers.forEach(function(h, i) { obj[h] = r[i]; });
      return obj;
    });
  return jsonResponse({ ok: true, pedidos: pedidos });
}

function doGet_estado(e, ss) {
  var tel2   = normalizarTelefono(e.parameter.telefono || "");
  var _s = leerSheet(ss, "Pedidos");
  if (!_s.sheet || !tel2) return jsonResponse({ ok: false, pedidos: [] });
  var eCOL  = {};
  _s.headers.forEach(function(h, i) { eCOL[h] = i; });
  var ultimos = _s.rows
    .filter(function(r) { return normalizarTelefono(r[eCOL["telefono"]] || "") === tel2; })
    .slice(-3).reverse()
    .map(function(r) {
      var obj = {};
      _s.headers.forEach(function(h, i) { obj[h] = r[i]; });
      return obj;
    });
  return jsonResponse({ ok: true, pedidos: ultimos });
}

function doGet_admin_pedidos(e, ss) {
  if (!verificarClave(e.parameter.clave || "")) return jsonResponse({ ok: false, error: "No autorizado" });
  var _s = leerSheet(ss, "Pedidos");
  if (!_s.sheet) return jsonResponse({ ok: false, pedidos: [] });
  var aCOL  = {};
  _s.headers.forEach(function(h, i) { aCOL[h] = i; });
  var pagina        = Math.max(1, parseInt(e.parameter.pagina || "1", 10));
  var porPagina     = Math.min(100, Math.max(10, parseInt(e.parameter.por || "50", 10)));
  var busq          = String(e.parameter.q || "").toLowerCase();
  // verArchivados=true → solo archivados | verArchivados=false → solo activos (default)
  var verArchivados = e.parameter.archivados === "1";
  var allRows       = _s.rows;
  var mapped = allRows.map(function(r, idx) {
    var archivadoVal = aCOL.hasOwnProperty("archivado") ? r[aCOL["archivado"]] : false;
    var esArchivado  = (archivadoVal === true || String(archivadoVal).toUpperCase() === "TRUE");
    return {
      fila:         idx + 2,
      fecha:        String(r[aCOL["fecha"]]        || ""),
      nombre:       String(r[aCOL["nombre"]]       || ""),
      telefono:     String(r[aCOL["telefono"]]     || ""),
      barrio:       String(r[aCOL["barrio"]]       || ""),
      ciudad:       String(r[aCOL["ciudad"]]       || ""),
      direccion:    String(r[aCOL["direccion"]]    || ""),
      casa:         String(r[aCOL["casa"]]         || ""),
      pago:         String(r[aCOL["pago"]]         || ""),
      zona_envio:   String(r[aCOL["zona_envio"]]   || ""),
      total:        Number(r[aCOL["total"]])        || 0,
      subtotal:     Number(r[aCOL["subtotal"]])     || 0,
      costo_envio:  Number(r[aCOL["costo_envio"]])  || 0,
      cupon:        String(r[aCOL["cupon"]]        || ""),
      descuento:    Number(r[aCOL["descuento"]])    || 0,
      estado_pago:  String(r[aCOL["estado_pago"]]  || "PENDIENTE"),
      estado_envio: String(r[aCOL["estado_envio"]] || "Recibido"),
      productos:    String(r[aCOL["productos"]]    || ""),
      nota:         String(r[aCOL["nota"]]         || ""),
      archivado:    esArchivado,
    };
  }).reverse().filter(function(p) {
    return verArchivados ? p.archivado : !p.archivado;
  });
  if (busq) {
    mapped = mapped.filter(function(p) {
      return (p.nombre + p.telefono + p.barrio + p.ciudad).toLowerCase().indexOf(busq) >= 0;
    });
  }
  var total     = mapped.length;
  var totalPags = Math.ceil(total / porPagina);
  var inicio    = (pagina - 1) * porPagina;
  var pedidos   = mapped.slice(inicio, inicio + porPagina);
  return jsonResponse({
    ok: true, pedidos: pedidos, verArchivados: verArchivados,
    paginacion: { pagina: pagina, porPagina: porPagina, total: total, totalPaginas: totalPags }
  });
}

function procesarNuevoPedido(ss, body) {
  guardarPedido(ss, body);

  try { if (body.telefono) upsertCliente(ss, body); }
  catch(e1) { logError("upsertCliente", e1); }

  try { if (body.cupon) incrementarUsoCupon(ss, body.cupon); }
  catch(e2) { logError("incrementarCupon", e2); }

  try { descontarStock(ss, body.productos, body.productos_json); }
  catch(e3) { logError("descontarStock", e3); }

  try { notificarPedido(body); }
  catch(e4) { Logger.log("Email: " + e4.message); }

  try { notificarWA(body); }
  catch(e5) { Logger.log("WA: " + e5.message); }

  cacheDelete("admin_dashboard_v1");
  cacheDelete("admin_rentabilidad_v1");
  cacheDelete("public_productos_v1");
  return jsonResponse({ ok: true });
}

function guardarPedido(ss, body) {
  var sheet = ss.getSheetByName("Pedidos");
  if (!sheet || sheet.getLastColumn() === 0) {
    inicializarPedidos();
    sheet = ss.getSheetByName("Pedidos");
  }
  appendRowByHeaders(sheet, {
    fecha:        new Date().toLocaleString("es-CO"),
    nombre:       body.nombre       || "",
    telefono:     normalizarTelefono(body.telefono || ""),
    ciudad:       body.ciudad       || "",
    departamento: body.departamento || "",
    barrio:       body.barrio       || "",
    direccion:    body.direccion    || "",
    casa:         body.casa         || "",
    conjunto:     body.conjunto     || "",
    nota:         body.nota         || "",
    cupon:        body.cupon        || "",
    descuento:    body.descuento    || 0,
    pago:         body.pago         || "",
    zona_envio:   body.zona_envio   || "",
    costo_envio:  body.costo_envio  || 0,
    subtotal:     body.subtotal     || 0,
    total:        Number(body.total) || Number(body.subtotal) || 0,
    estado_pago:  body.estado_pago  || "PENDIENTE",
    estado_envio:    "Recibido",
    productos:       body.productos      || "",
    productos_json:  body.productos_json || "",
  });
}

function upsertCliente(ss, body) {
  var sheet = ss.getSheetByName("Clientes");
  if (!sheet || sheet.getLastColumn() === 0) {
    inicializarClientes();
    sheet = ss.getSheetByName("Clientes");
  }
  if (!sheet) return;

  var tel = normalizarTelefono(body.telefono || "");
  if (!tel) return;

  var totalPedido = Number(body.total) || Number(body.subtotal) || 0;
  var fecha       = new Date().toLocaleString("es-CO");
  var headers     = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var COL = {};
  headers.forEach(function(h, i) { COL[String(h).toLowerCase().trim()] = i + 1; });

  var lastRow    = sheet.getLastRow();
  var clienteRow = -1;
  if (lastRow >= 2) {
    var telColIdx = COL["telefono"] || 4;
    var finder    = sheet.getRange(2, telColIdx, lastRow - 1, 1)
                         .createTextFinder(tel).matchEntireCell(true);
    var found     = finder.findNext();
    clienteRow    = found ? found.getRow() : -1;
  }

  if (clienteRow === -1) {
    appendRowByHeaders(sheet, {
      primera_compra: fecha,
      ultima_compra:  fecha,
      nombre:         body.nombre    || "",
      telefono:       tel,
      ciudad:         body.ciudad    || "Bogota",
      barrio:         body.barrio    || "",
      direccion:      body.direccion || "",
      total_pedidos:  1,
      total_gastado:  totalPedido,
      tipo:           clasificarCliente(1, totalPedido),
    });
  } else {
    var filaData   = sheet.getRange(clienteRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    var pedidosAnt = Number(filaData[COL["total_pedidos"] - 1]) || 0;
    var gastadoAnt = Number(filaData[COL["total_gastado"] - 1]) || 0;
    var nuevoPedidos = pedidosAnt + 1;
    var nuevoGastado = gastadoAnt + totalPedido;
    updateRowByHeaders(sheet, clienteRow, {
      ultima_compra:  fecha,
      nombre:         body.nombre    || filaData[COL["nombre"]    - 1],
      ciudad:         body.ciudad    || filaData[COL["ciudad"]    - 1],
      barrio:         body.barrio    || filaData[COL["barrio"]    - 1],
      direccion:      body.direccion || filaData[COL["direccion"] - 1],
      total_pedidos:  nuevoPedidos,
      total_gastado:  nuevoGastado,
      tipo:           clasificarCliente(nuevoPedidos, nuevoGastado),
    });
  }
}

function clasificarCliente(pedidos, gastado) {
  if (pedidos >= 10 || gastado >= 500000) return "VIP";
  if (pedidos >= 2  || gastado >= 150000) return "Recurrente";
  return "Nuevo";
}

function notificarWA(body) {
  if (!CONFIG_WA.ACTIVO || !CONFIG_WA.API_KEY) return;
  var total   = body.total ? "$ " + Number(body.total).toLocaleString("es-CO") : "A convenir";
  var mensaje = "NUEVO PEDIDO - Limpieza RR\n" +
    "Cliente: " + (body.nombre    || "") + "\n" +
    "Tel: "     + (body.telefono  || "") + "\n" +
    "Barrio: "  + (body.barrio    || "") + "\n" +
    "Pago: "    + (body.pago      || "") + "\n" +
    "Total: "   + total            + "\n" +
    "Zona: "    + (body.zona_envio || "");
  var url = "https://api.callmebot.com/whatsapp.php" +
    "?phone="  + CONFIG_WA.NUMERO +
    "&text="   + encodeURIComponent(mensaje) +
    "&apikey=" + CONFIG_WA.API_KEY;
  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    Logger.log("WA: " + resp.getResponseCode());
  } catch(err) {
    Logger.log("WA error: " + err.message);
  }
}

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
    var cell = sheet.getRange(fila, COL["estado_pago"]);
    cell.setValue(body.estado_pago);
    aplicarColorPago(cell, body.estado_pago);
  }
}

/* ──────────────────────────────────────────────────────────────
   ARCHIVAR / RECUPERAR PEDIDO
   
   Archivar: flag archivado=TRUE en la columna "archivado".
     - No borra el pedido ni cambia sus estados originales.
     - Lo oculta de la vista principal del admin.
     - El Dashboard sigue excluyendo el pedido si no era PAGADO/CE.
   
   Recuperar: flag archivado=FALSE — vuelve a la lista normal.
   
   La columna "archivado" se crea automáticamente si no existe.
────────────────────────────────────────────────────────────── */
function _asegurarColumnaArchivado(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx     = headers.map(function(h){ return String(h).toLowerCase().trim(); }).indexOf("archivado");
  if (idx >= 0) return idx + 1;  // columna ya existe → retornar número (1-indexed)
  // Crear al final
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue("archivado")
    .setFontWeight("bold").setBackground("#374151").setFontColor("#9CA3AF")
    .setNote("TRUE = archivado (oculto en la lista). FALSE/vacío = activo.");
  return newCol;
}

function archivarPedido(ss, body) {
  var sheet = ss.getSheetByName("Pedidos");
  if (!sheet) throw new Error("Hoja Pedidos no encontrada");
  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) throw new Error("Fila inválida");
  var col = _asegurarColumnaArchivado(sheet);
  sheet.getRange(fila, col).setValue(true)
    .setBackground("#1F2937").setFontColor("#6B7280");
  logInfo("archivarPedido", "Fila " + fila + " archivada");
  invalidarCacheDashboard();
  cacheDelete("admin_rentabilidad_v1");
}

function recuperarPedido(ss, body) {
  var sheet = ss.getSheetByName("Pedidos");
  if (!sheet) throw new Error("Hoja Pedidos no encontrada");
  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) throw new Error("Fila inválida");
  var col = _asegurarColumnaArchivado(sheet);
  sheet.getRange(fila, col).setValue(false)
    .clearFormat();
  logInfo("recuperarPedido", "Fila " + fila + " recuperada");
  invalidarCacheDashboard();
  cacheDelete("admin_rentabilidad_v1");
}

/* ──────────────────────────────────────────────────────────────
   MODIFICAR PEDIDO (Campos libres)
────────────────────────────────────────────────────────────── */
function modificarPedido(ss, body) {
  var sheet = ss.getSheetByName("Pedidos");
  if (!sheet) throw new Error("Hoja Pedidos no encontrada");
  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) throw new Error("Fila inválida");
  
  var datos = body.datos;
  if (!datos) throw new Error("No hay datos para modificar");
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var COL = {};
  headers.forEach(function(h, i) { COL[String(h).toLowerCase().trim()] = i + 1; });
  
  var actualizados = 0;
  Object.keys(datos).forEach(function(key) {
    if (COL[key]) {
      sheet.getRange(fila, COL[key]).setValue(datos[key]);
      actualizados++;
    }
  });
  
  logInfo("modificarPedido", "Fila " + fila + " (" + actualizados + " campos modificados)");
  invalidarCacheDashboard();
  cacheDelete("admin_rentabilidad_v1");
}
