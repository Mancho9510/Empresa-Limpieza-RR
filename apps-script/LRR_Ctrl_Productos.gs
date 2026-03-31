/* ──────────────────────────────────────────────────────────────
   LRR_Ctrl_Productos.gs
   Controlador para productos, stock y precios
────────────────────────────────────────────────────────────── */

function doGet_productos(e, ss) {
  var _s = leerSheet(ss, "Productos");
  if (!_s.sheet) return jsonResponse({ ok: false, error: "Hoja Productos no encontrada" });
  var COL = {};
  _s.headers.forEach(function(h, i) { COL[h] = i; });
  var rows = _s.rows.map(function(row) {
    var obj = {};
    _s.headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
  return jsonResponse({ ok: true, data: rows });
}

function doGet_admin_productos(e, ss) {
  if (!verificarClave(e.parameter.clave || "")) return jsonResponse({ ok: false, error: "No autorizado" });

  // Cache 10 min — productos cambian poco en tiempo real
  var CACHE_KEY = "admin_productos_v1";
  var forceRefresh = e.parameter.refresh === "1";
  if (!forceRefresh) {
    var cached = cacheGet(CACHE_KEY);
    if (cached) { cached.fromCache = true; return jsonResponse(cached); }
  }

  var _s = leerSheet(ss, "Productos");
  if (!_s.sheet) return jsonResponse({ ok: false, productos: [] });
  var pRows = _s.rows
    .map(function(r, idx) {
      var obj = { fila: idx + 2 };
      _s.headers.forEach(function(h, i) { obj[h] = r[i]; });
      ["imagen","imagen2","imagen3"].forEach(function(key) {
        if (obj[key]) obj[key] = sanitizeDriveUrl(String(obj[key]));
      });
      var precio = Number(obj["precio"]) || 0;
      var costo  = Number(obj["costo"])  || 0;
      var _g = calcGanancia(precio, costo);  // centralizado en LRR_Utils.gs
      obj["ganancia_calc"]  = _g.pct;
      obj["ganancia_pesos"] = _g.pesos;
      return obj;
    });
  var resultado = { ok: true, productos: pRows, fromCache: false };
  cachePut(CACHE_KEY, resultado, 600);  // 10 min
  return jsonResponse(resultado);
}

function descontarStock(ss, productosStr, productosJsonStr) {
  if (!productosStr && !productosJsonStr) return;
  var _s = leerSheet(ss, "Productos");
  if (!_s.sheet) return;
  var nomIdx  = _s.headers.indexOf("nombre");
  var tamIdx  = _s.headers.indexOf("tamano");
  var stkIdx  = _s.headers.indexOf("stock");
  if (stkIdx < 0) return;
  var alertas = [];
  parsearProductosPedido(productosStr, productosJsonStr).forEach(function(item) {
    var cant   = item.cantidad;
    var nomTam = item.nombre;
    for (var i = 0; i < _s.rows.length; i++) {
      var clave = (String(_s.rows[i][nomIdx]||"").trim() + " " + String(_s.rows[i][tamIdx]||"").trim()).trim();
      if (clave.toLowerCase() === nomTam) {
        var stockActual = _s.rows[i][stkIdx];
        if (stockActual !== "" && stockActual !== null && !isNaN(Number(stockActual))) {
          var nuevoStock = Math.max(0, Number(stockActual) - cant);
          var cell = _s.sheet.getRange(i + 2, stkIdx + 1);
          cell.setValue(nuevoStock);
          aplicarColorStock(cell, nuevoStock);
          if (nuevoStock === 0) {
            alertas.push({ nombre: clave, stock: 0, nivel: "AGOTADO" });
          } else if (nuevoStock <= 5) {
            alertas.push({ nombre: clave, stock: nuevoStock, nivel: "BAJO" });
          }
        }
        break;
      }
    }
  });
  if (alertas.length > 0) {
    try { alertarStock(alertas); } catch(e) { Logger.log("Alerta stock: " + e.message); }
  }
}

function alertarStock(alertas) {
  var email = Session.getActiveUser().getEmail();
  if (!email) return;
  var agotados = alertas.filter(function(a){ return a.nivel === "AGOTADO"; });
  var bajos    = alertas.filter(function(a){ return a.nivel === "BAJO"; });
  var subject  = agotados.length > 0
    ? "🚨 AGOTADO — " + agotados[0].nombre + " | Limpieza RR"
    : "⚠️ Alerta de Stock — Limpieza RR";
  var html = "<h2 style='color:#991B1B;font-family:sans-serif'>⚠️ Alerta de Inventario</h2>";
  if (agotados.length > 0) {
    html += "<h3 style='color:#991B1B'>🚨 AGOTADOS</h3><ul>";
    agotados.forEach(function(a){ html += "<li>" + a.nombre + "</li>"; });
    html += "</ul>";
  }
  if (bajos.length > 0) {
    html += "<h3 style='color:#854D0E'>⚠️ Stock Bajo (≤5)</h3><ul>";
    bajos.forEach(function(a){ html += "<li>" + a.nombre + " — " + a.stock + " uds</li>"; });
    html += "</ul>";
  }
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: html });
}

function verificarStockCompleto() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var _s = leerSheet(ss, "Productos");
  if (!_s.sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var nomIdx  = _s.headers.indexOf("nombre");
  var tamIdx  = _s.headers.indexOf("tamano");
  var stkIdx  = _s.headers.indexOf("stock");
  if (stkIdx < 0) { Logger.log("Columna stock no encontrada"); return; }
  var alertas = [];
  for (var i = 0; i < _s.rows.length; i++) {
    var sv = _s.rows[i][stkIdx];
    if (sv === "" || sv === null) continue;
    var sn = Number(sv); if (isNaN(sn)) continue;
    var clave = (String(_s.rows[i][nomIdx]||"").trim() + " " + String(_s.rows[i][tamIdx]||"").trim()).trim();
    if (sn === 0)     alertas.push({ nombre: clave, stock: 0,  nivel: "AGOTADO" });
    else if (sn <= 5) alertas.push({ nombre: clave, stock: sn, nivel: "BAJO" });
  }
  if (alertas.length === 0) { Logger.log("✅ Sin alertas."); return; }
  Logger.log("⚠️ " + alertas.length + " alertas.");
  try { alertarStock(alertas); } catch(e) { Logger.log("Error: " + e.message); }
}

function actualizarCostoProducto(ss, body) {
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) return { ok: false };
  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) return { ok: false };
  var headers    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var hLower     = headers.map(function(h){ return String(h).toLowerCase().trim(); });
  var costoCol   = hLower.indexOf("costo")        + 1;
  var gananciaCol= hLower.indexOf("ganancia_pct") + 1;
  var precioCol  = hLower.indexOf("precio")       + 1;
  if (!costoCol) return { ok: false };
  var nuevoCosto = Number(body.costo);
  sheet.getRange(fila, costoCol).setValue(nuevoCosto);
  var _g = { pct: null, pesos: null }, precio = 0;
  if (gananciaCol && precioCol) {
    precio = Number(sheet.getRange(fila, precioCol).getValue());
    _g = calcGanancia(precio, nuevoCosto);
    if (_g.pct !== null) {
      var ganCell = sheet.getRange(fila, gananciaCol);
      ganCell.clearFormat().setValue(_g.pct).setNumberFormat('0.00"%"');
      if (_g.pct < 10)      ganCell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
      else if (_g.pct < 30) ganCell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
      else                  ganCell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    }
  }
  cacheDelete("admin_rentabilidad_v1");
  cacheDelete("admin_productos_v1");
  Logger.log("Costo fila " + fila + " = " + nuevoCosto);
  return { ok: true, fila: fila, costo: nuevoCosto, precio: precio, ganancia_pct: _g.pct, ganancia_pesos: _g.pesos };
}

function actualizarStockProducto(ss, body) {
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) return;
  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) return;
  var headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var stkCol   = headers.map(function(h){ return String(h).toLowerCase().trim(); }).indexOf("stock") + 1;
  if (!stkCol) return;
  var nuevoStock = body.stock === "" ? "" : Number(body.stock);
  var cell = sheet.getRange(fila, stkCol);
  cell.setValue(nuevoStock);
  aplicarColorStock(cell, nuevoStock);
  cacheDelete("admin_productos_v1");
  Logger.log("Stock fila " + fila + " = " + nuevoStock);
}

function actualizarPrecioProducto(ss, body) {
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) return;
  var fila = parseInt(body.fila, 10);
  if (!fila || fila < 2) return;
  var headers    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var hLower     = headers.map(function(h){ return String(h).toLowerCase().trim(); });
  var precioCol  = hLower.indexOf("precio")       + 1;
  var costoCol   = hLower.indexOf("costo")        + 1;
  var gananciaCol= hLower.indexOf("ganancia_pct") + 1;
  if (!precioCol) return;
  var nuevoPrecio = Number(body.precio);
  sheet.getRange(fila, precioCol).setValue(nuevoPrecio)
    .setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
  if (gananciaCol && costoCol) {
    var costo = Number(sheet.getRange(fila, costoCol).getValue());
    var _gp = calcGanancia(nuevoPrecio, costo);
    if (_gp.pct !== null) {
      var ganCell = sheet.getRange(fila, gananciaCol);
      ganCell.clearFormat().setValue(_gp.pct).setNumberFormat('0.00"%"');
      if (_gp.pct < 10)      ganCell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
      else if (_gp.pct < 30) ganCell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
      else                   ganCell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    }
  }
  cacheDelete("admin_rentabilidad_v1");
  cacheDelete("admin_productos_v1");
  Logger.log("Precio fila " + fila + " = " + nuevoPrecio);
}
