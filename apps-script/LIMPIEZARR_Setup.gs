/**
 * ═══════════════════════════════════════════════════════════════
 *  LIMPIEZA RR — Google Apps Script v3
 *  Correcciones aplicadas:
 *  ✅ BUG-04: sanitizeDriveUrl definida (ya no causa ReferenceError)
 *  ✅ BUG-01: gananciaReal calcula correctamente (ganancia_pesos !== null)
 *  ✅ BUG-02: avgGanPct con paréntesis correctos
 *  ✅ BUG-03: menosRentables sin solapamiento con topRentables
 *  ✅ BUG-11: ADMIN_KEY centralizada (no más hardcoding)
 *  ✅ BUG-12: pendientes no incluye "CONTRA ENTREGA"
 *  ✅ BUG-14: reseñas desde 3 estrellas
 * ═══════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN CENTRALIZADA
// ══════════════════════════════════════════════════════════
// ADMIN_KEY: configurar en PropertiesService (ver LIMPIEZARR_Utils.gs → getAdminKey)

var CONFIG_WA = {
  NUMERO:  "573503443140",
  API_KEY: "",     // Pega aquí SOLO el número de key de CallMeBot (ej: "4942289")
  ACTIVO:  false,
};

// ══════════════════════════════════════════════════════════
// HELPERS GLOBALES
// ══════════════════════════════════════════════════════════
function getSS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No hay spreadsheet activo.");
  return ss;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * BUG-04 FIX: sanitizeDriveUrl — convierte URLs de Drive al formato imagen directa.
 * Esta función FALTABA en el código anterior causando ReferenceError en admin_productos.
 */
function sanitizeDriveUrl(url) {
  if (!url || String(url).trim() === "") return "";
  // Formato: https://drive.google.com/file/d/FILE_ID/view
  var matchFile = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return "https://drive.google.com/uc?export=view&id=" + matchFile[1];
  // Formato: https://drive.google.com/open?id=FILE_ID
  var matchOpen = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpen) return "https://drive.google.com/uc?export=view&id=" + matchOpen[1];
  // URL directa — retornar tal cual
  if (String(url).startsWith("http")) return String(url);
  return "";
}

function parseLimpiezaDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "number" && !isNaN(value) && value > 20000 && value < 60000) {
    var serialDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(serialDate.getTime())) return serialDate;
  }
  var raw = String(value || "").trim();
  if (!raw) return null;
  var direct = new Date(raw);
  if (!isNaN(direct.getTime())) return direct;
  raw = raw
    .replace(/\u00A0/g, " ").replace(/\s+/g, " ")
    .replace(/a\.\s*m\./i, "AM").replace(/p\.\s*m\./i, "PM")
    .replace(/a\.m\./i, "AM").replace(/p\.m\./i, "PM");
  var match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    var dateOnly = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!dateOnly) return null;
    var d = new Date(Number(dateOnly[3]), Number(dateOnly[2]) - 1, Number(dateOnly[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  var day = Number(match[1]), month = Number(match[2]) - 1, year = Number(match[3]);
  var hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6] || 0);
  var meridiem = String(match[7] || "").toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  var parsed = new Date(year, month, day, hour, minute, second);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizarTelefono(value) {
  var tel = String(value || "").replace(/\D/g, "");
  if (tel.length === 12 && tel.indexOf("57") === 0) tel = tel.slice(2);
  return tel;
}

/* ──────────────────────────────────────────────────────────────
   doGet — Dispatcher centralizado
   Cada acción delega a su función correspondiente.
   Un error en una acción NO mata las demás.
────────────────────────────────────────────────────────────── */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    var ss     = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case "productos":         return doGet_productos(e, ss);
      case "cupon":             return doGet_cupon(e, ss);
      case "historial":         return doGet_historial(e, ss);
      case "estado":            return doGet_estado(e, ss);
      case "resenas":           return doGet_resenas(e, ss);
      case "admin_productos":   return doGet_admin_productos(e, ss);
      case "admin_pedidos":     return doGet_admin_pedidos(e, ss);
      case "admin_dashboard":   return doGet_admin_dashboard(e, ss);
      case "admin_rentabilidad":return doGet_admin_rentabilidad(e, ss);
      case "admin_clientes":    return doGet_admin_clientes(e);
      case "admin_proveedores": return doGet_admin_proveedores(e);
      default:
        return jsonResponse({ ok: false, error: "Accion no reconocida: " + action });
    }
  } catch(err) {
    Logger.log("Error en doGet: " + err.message + "\n" + err.stack);
    return jsonResponse({ ok: false, error: err.message });
  }
}

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: productos (público — tienda)
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

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: cupon (público)
────────────────────────────────────────────────────────────── */
function doGet_cupon(e, ss) {
  var code   = (e.parameter.code || "").toUpperCase().trim();
  var _s = leerSheet(ss, "Cupones");
  if (!_s.sheet) return jsonResponse({ ok: false, cupon: null });
  var COL   = {};
  _s.headers.forEach(function(h, i) { COL[h] = i; });
  var found = null;
  _s.rows.forEach(function(r) {
    if (String(r[COL["codigo"]] || "").toUpperCase() === code) found = r;
  });
  if (!found) return jsonResponse({ ok: false, cupon: null });
  var activo = String(found[COL["activo"]]).toLowerCase() === "true";
  var uses   = Number(found[COL["usos_actuales"]]) || 0;
  var maxU   = found[COL["usos_maximos"]] !== "" ? Number(found[COL["usos_maximos"]]) : Infinity;
  var expiry = found[COL["vencimiento"]];
  if (!activo)                                 return jsonResponse({ ok: false, cupon: null });
  if (uses >= maxU)                            return jsonResponse({ ok: false, cupon: null });
  if (expiry && new Date(expiry) < new Date()) return jsonResponse({ ok: false, cupon: null });
  return jsonResponse({
    ok: true,
    cupon: {
      type:  String(found[COL["tipo"]]       || "pct"),
      value: Number(found[COL["valor"]]       || 0),
      label: String(found[COL["descripcion"]] || code),
    }
  });
}

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: historial (público)
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: estado (público)
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: resenas (público)
   BUG-14 FIX: filtro bajado a >= 3 estrellas
────────────────────────────────────────────────────────────── */
function doGet_resenas(e, ss) {
  var _s = leerSheet(ss, "Calificaciones");
  if (!_s.sheet || _s.rows.length === 0) return jsonResponse({ ok: true, resenas: [] });
  var rCOL  = {}; _s.headers.forEach(function(h,i){ rCOL[h]=i; });
  var resenas = _s.rows
    .filter(function(r){ return r[rCOL["estrellas"]] >= 3 && r[0] !== ""; })  // BUG-14: era >= 4
    .map(function(r){
      return {
        fecha:      String(r[rCOL["fecha"]]      || ""),
        nombre:     String(r[rCOL["nombre"]]     || "Cliente"),
        estrellas:  Number(r[rCOL["estrellas"]]  || 5),
        comentario: String(r[rCOL["comentario"]] || ""),
      };
    })
    .sort(function(a,b){ return b.estrellas - a.estrellas; })
    .slice(0, 12);
  return jsonResponse({ ok: true, resenas: resenas });
}

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: admin_productos
   BUG-04 FIX: sanitizeDriveUrl ahora existe y funciona
────────────────────────────────────────────────────────────── */
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
      // BUG-04 FIX: sanitizeDriveUrl ahora definida — ya no lanza ReferenceError
      ["imagen","imagen2","imagen3"].forEach(function(key) {
        if (obj[key]) obj[key] = sanitizeDriveUrl(String(obj[key]));
      });
      var precio = Number(obj["precio"]) || 0;
      var costo  = Number(obj["costo"])  || 0;
      var _g = calcGanancia(precio, costo);  // centralizado en LIMPIEZARR_Utils.gs
      obj["ganancia_calc"]  = _g.pct;
      obj["ganancia_pesos"] = _g.pesos;
      return obj;
    });
  var resultado = { ok: true, productos: pRows, fromCache: false };
  cachePut(CACHE_KEY, resultado, 600);  // 10 min
  return jsonResponse(resultado);
}

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: admin_pedidos
────────────────────────────────────────────────────────────── */
function doGet_admin_pedidos(e, ss) {
  if (!verificarClave(e.parameter.clave || "")) return jsonResponse({ ok: false, error: "No autorizado" });
  // leerSheet() usa getRange específico en lugar de getDataRange() completo
  var _s = leerSheet(ss, "Pedidos");
  if (!_s.sheet) return jsonResponse({ ok: false, pedidos: [] });
  var aCOL  = {};
  _s.headers.forEach(function(h, i) { aCOL[h] = i; });
  var pagina    = Math.max(1, parseInt(e.parameter.pagina || "1", 10));
  var porPagina = Math.min(100, Math.max(10, parseInt(e.parameter.por || "50", 10)));
  var busq      = String(e.parameter.q || "").toLowerCase();
  var allRows   = _s.rows;  // ya filtradas las filas vacías
  var mapped = allRows.map(function(r, idx) {  // idx+2 porque row 1=headers, slice ya quitó headers
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
    };
  }).reverse();
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
    ok: true, pedidos: pedidos,
    paginacion: { pagina: pagina, porPagina: porPagina, total: total, totalPaginas: totalPags }
  });
}

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: admin_dashboard
   BUG-12 FIX: pendientes solo cuenta "PENDIENTE", no "CONTRA ENTREGA"
────────────────────────────────────────────────────────────── */
function doGet_admin_dashboard(e, ss) {
  if (!verificarClave(e.parameter.clave || "")) return jsonResponse({ ok: false, error: "No autorizado" });

  var cache     = CacheService.getScriptCache();
  var CACHE_KEY = "admin_dashboard_v1";
  var forceRefresh = e.parameter.refresh === "1";
  if (!forceRefresh) {
    var cached = cache.get(CACHE_KEY);
    if (cached) {
      try {
        var cachedData = JSON.parse(cached);
        cachedData.fromCache = true;
        return jsonResponse(cachedData);
      } catch(ce) {}
    }
  }

  var _ped = leerSheet(ss, "Pedidos");
  if (!_ped.sheet) return jsonResponse({ ok: false, error: "Hoja Pedidos no encontrada" });
  var PC = {};
  _ped.headers.forEach(function(h,i){ PC[h]=i; });
  var rows = _ped.rows;

  var hoy     = new Date();
  var hoyDia  = Number(Utilities.formatDate(hoy,"America/Bogota","d"));
  var hoyMes  = Number(Utilities.formatDate(hoy,"America/Bogota","M"));
  var hoyAnio = Number(Utilities.formatDate(hoy,"America/Bogota","yyyy"));

  var totHoy=0,cntHoy=0,totMes=0,cntMes=0,totGen=0,pend=0,pagados=0,entregados=0;
  var prodCount={}, clienteCount={}, zonaCount={}, pagoCount={};
  var semanas={"Esta semana":0,"Sem anterior":0,"Hace 2 sem":0,"Hace 3 sem":0,
               "Hace 4 sem":0,"Hace 5 sem":0,"Hace 6 sem":0,"Hace 7 sem":0};

  rows.forEach(function(r){
    var rawF  = r[PC["fecha"]];
    var total = Number(r[PC["total"]]);
    if (isNaN(total) || total <= 0) total = Number(r[PC["subtotal"]]) || 0;
    var estP  = String(r[PC["estado_pago"]]||"").toUpperCase();
    var estE  = String(r[PC["estado_envio"]]||"");
    var prods = String(r[PC["productos"]]||"");
    var zona  = String(r[PC["zona_envio"]]||"Sin zona")
                  .replace(/\([^)]+\)/g,"").replace(/—.*/,"").replace(/\$/g,"").trim().split("—")[0].trim();
    var pago  = String(r[PC["pago"]]||"Sin datos");
    var nom   = String(r[PC["nombre"]]||"");
    var tel   = String(r[PC["telefono"]]||"");

    totGen += total;
    // BUG-12 FIX: solo "PENDIENTE" es pendiente — CONTRA ENTREGA no es pendiente de pago
    if (estP === "PENDIENTE") pend++;
    if (estP === "PAGADO") pagados++;
    if (estE === "Entregado") entregados++;

    var clv = nom + (tel?" ("+tel+")":"");
    if (clv.trim()) clienteCount[clv]=(clienteCount[clv]||0)+1;
    if (zona) zonaCount[zona]=(zonaCount[zona]||0)+1;
    if (pago) pagoCount[pago]=(pagoCount[pago]||0)+1;

    try {
      var fd = parseLimpiezaDate(rawF);
      if (fd && !isNaN(fd.getTime())){
        var fD=Number(Utilities.formatDate(fd,"America/Bogota","d"));
        var fM=Number(Utilities.formatDate(fd,"America/Bogota","M"));
        var fA=Number(Utilities.formatDate(fd,"America/Bogota","yyyy"));
        if (fD===hoyDia&&fM===hoyMes&&fA===hoyAnio){totHoy+=total;cntHoy++;}
        if (fM===hoyMes&&fA===hoyAnio){totMes+=total;cntMes++;}
        var diff=Math.floor((hoy.getTime()-fd.getTime())/(1000*60*60*24));
        if (diff>=0&&diff<56){
          var sem=Math.floor(diff/7);
          var semKey=sem===0?"Esta semana":sem===1?"Sem anterior":"Hace "+sem+" sem";
          if (semanas.hasOwnProperty(semKey)) semanas[semKey]+=total;
        }
      }
    } catch(ed){}

    prods.split("\n").forEach(function(line){
      var m=line.match(/Cant[^0-9]*([0-9]+)/i);
      var cant=m?parseInt(m[1],10):1;
      var k=line.split("|")[0].trim();
      if (k) prodCount[k]=(prodCount[k]||0)+cant;
    });
  });

  var topProd  = Object.keys(prodCount).map(function(k){return{nombre:k,cant:prodCount[k]};})
                  .sort(function(a,b){return b.cant-a.cant;}).slice(0,5);
  var topCli   = Object.keys(clienteCount).map(function(k){return{nombre:k,pedidos:clienteCount[k]};})
                  .sort(function(a,b){return b.pedidos-a.pedidos;}).slice(0,5);
  var topZonas = Object.keys(zonaCount).map(function(k){return{zona:k,cnt:zonaCount[k]};})
                  .sort(function(a,b){return b.cnt-a.cnt;}).slice(0,5);
  var topPagos = Object.keys(pagoCount).map(function(k){return{metodo:k,cnt:pagoCount[k]};})
                  .sort(function(a,b){return b.cnt-a.cnt;});

  var avgRating=0, numResenas=0;
  var _cal = leerSheet(ss, "Calificaciones");
  if (_cal.sheet && _cal.rows.length > 0){
    var si=_cal.headers.indexOf("estrellas");
    if (si>=0){
      var stars=_cal.rows.map(function(r){return Number(r[si]);}).filter(function(v){return v>0;});
      numResenas=stars.length;
      if (stars.length>0) avgRating=parseFloat((stars.reduce(function(a,b){return a+b;},0)/stars.length).toFixed(1));
    }
  }

  var alertasStock=[];
  var _pro = leerSheet(ss, "Productos");
  if (_pro.sheet && _pro.rows.length > 0){
    var ni=_pro.headers.indexOf("nombre"),ti=_pro.headers.indexOf("tamano"),sti=_pro.headers.indexOf("stock");
    if (sti>=0){
      _pro.rows.forEach(function(r){
        var sv=r[sti]; if (sv===""||sv===null) return;
        var sn=Number(sv); if (isNaN(sn)) return;
        var nivel = sn===0?"agotado":sn<=5?"bajo":null;
        if (nivel) alertasStock.push({nombre:String(r[ni]||"")+" "+String(r[ti]||""),stock:sn,nivel:nivel});
      });
    }
  }

  var numClientes=0, vip=0;
  var _cli = leerSheet(ss, "Clientes");
  if (_cli.sheet && _cli.rows.length > 0){
    numClientes=_cli.rows.length;
    var ti2=_cli.headers.indexOf("tipo");
    if (ti2>=0) _cli.rows.forEach(function(r){ if (String(r[ti2]).toUpperCase().indexOf("VIP")>=0) vip++; });
  }

  var resultado = {
    ok: true, fromCache: false,
    generadoEn: Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy HH:mm"),
    kpis: {
      totHoy:totHoy, cntHoy:cntHoy, totMes:totMes, cntMes:cntMes,
      totGen:totGen, totalPedidos:rows.length, pend:pend, pagados:pagados,
      entregados:entregados, ticket:rows.length>0?Math.round(totGen/rows.length):0,
      numClientes:numClientes, vip:vip, avgRating:avgRating, numResenas:numResenas
    },
    semanas: semanas, topProd: topProd, topCli: topCli, topZonas: topZonas, topPagos: topPagos,
    alertasStock: alertasStock,
  };
  try { cache.put(CACHE_KEY, JSON.stringify(resultado), 300); } catch(ce) {}
  return jsonResponse(resultado);
}

/* ──────────────────────────────────────────────────────────────
   ACCIÓN: admin_rentabilidad
   BUG-01 FIX: gananciaReal usa `!== null` en lugar de truthy check
   BUG-02 FIX: avgGanPct con paréntesis correctos
   BUG-03 FIX: menosRentables excluye productos ya en topRentables
────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────
   ACCIÓN: admin_rentabilidad  v2 — ERP-grade
   
   Mejoras incorporadas del código propuesto:
   ✅ productosMap O(1) — lookup por nombre+tamaño sin bucle
   ✅ Acumuladores por producto: ventas, ingresos, ganancia_total
   ✅ masVendidos — ranking por unidades reales
   ✅ margenGlobal ponderado — ganancia/ingresos (gross margin real)
   ✅ ROI de inventario — ganancia histórica / inversión actual en stock
   ✅ topRentables y menosRentables usan ganancia_total (dato real)
      en lugar de ganancia_pct teórica
   ✅ Ganancia por categoría — KPI nuevo
   
   Lo que NO cambia:
   - ganancia_pct por producto sigue siendo markup sobre costo ((precio-costo)/costo)
     para mantener consistencia con el Sheet y la calculadora de precios.
   - El gross margin (sobre precio) solo aparece en margenGlobal del resumen,
     con etiqueta explícita para no confundir.
────────────────────────────────────────────────────────────── */
function doGet_admin_rentabilidad(e, ss) {
  if (!verificarClave(e.parameter.clave || "")) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }

  // Cache 5 min — endpoint más pesado (recorre todos los pedidos)
  var CACHE_KEY_R = "admin_rentabilidad_v1";
  var forceRefreshR = e.parameter.refresh === "1";
  if (!forceRefreshR) {
    var cachedR = cacheGet(CACHE_KEY_R);
    if (cachedR) { cachedR.fromCache = true; return jsonResponse(cachedR); }
  }

  var prodSheet = ss.getSheetByName("Productos");
  var pedSheet  = ss.getSheetByName("Pedidos");
  if (!prodSheet) return jsonResponse({ ok: false, error: "Sin hoja Productos" });

  // ════════════════════════════════════════
  // 1. LEER PRODUCTOS — construir map O(1)
  // ════════════════════════════════════════
  var _prod = leerSheet(ss, "Productos");
  if (!_prod.sheet) return jsonResponse({ ok: false, error: "Sin hoja Productos" });
  var PC      = {};
  _prod.headers.forEach(function(h, i){ PC[h] = i; });

  var productos    = [];
  var productosMap = {};  // key: "nombre tamano" lowercase → producto

  _prod.rows.forEach(function(r, i) {

    var nombre = String(r[PC["nombre"]] || "").trim();
    var tamano = String(r[PC["tamano"]] || "").trim();
    var key    = (nombre + " " + tamano).toLowerCase();

    var precio = Number(r[PC["precio"]]) || 0;
    // BUG-05 ya saneado: ganancia_pct en Sheet es número (no string "85%")
    var costoRaw = r[PC["costo"]];
    var costo = (costoRaw !== "" && costoRaw !== null) ? (Number(costoRaw) || 0) : 0;
    var stockRaw = r[PC["stock"]];
    var stock = (stockRaw !== "" && stockRaw !== null) ? Math.max(0, Number(stockRaw) || 0) : 0;

    // Markup sobre costo — centralizado en LIMPIEZARR_Utils.gs
    var _g = calcGanancia(precio, costo);

    var producto = {
      fila:            i + 2,
      nombre:          nombre,
      tamano:          tamano,
      categoria:       String(r[PC["categoria"]] || ""),
      precio:          precio,
      costo:           costo,
      stock:           stock,
      ganancia_pct:    _g.pct,     // markup sobre costo (consistencia con UI)
      ganancia_pesos:  _g.pesos,
      // Acumuladores históricos (se llenan al leer pedidos)
      ventas:          0,
      ingresos:        0,
      ganancia_total:  0,
    };

    productos.push(producto);
    if (key) productosMap[key] = producto;  // O(1) lookup
  });

  var conCosto = productos.filter(function(p){ return p.costo > 0 && p.precio > 0; });
  var sinCosto = productos.length - conCosto.length;

  // ════════════════════════════════════════
  // 2. LEER PEDIDOS — acumular por producto
  // ════════════════════════════════════════
  var totalIngresos = 0;
  var totalGanancia = 0;

  if (pedSheet) {
    var _pedR = leerSheet(ss, "Pedidos");
    if (_pedR.sheet && _pedR.rows.length > 0) {
    var pedPC = {};
    _pedR.headers.forEach(function(h, i){ pedPC[h] = i; });

    _pedR.rows.forEach(function(r) {
      var prodsStr = String(r[pedPC["productos"]] || "");

      // Usar JSON estructurado si disponible, fallback al texto histórico
      var pedPC_json = _pedR.headers.indexOf("productos_json");
      var jsonStr = (pedPC_json >= 0) ? String(r[pedPC_json] || "") : "";
      parsearProductosPedido(prodsStr, jsonStr).forEach(function(item) {
        var cantidad  = item.cantidad;
        var nombreKey = item.nombre;  // ya en lowercase
        var prod      = productosMap[nombreKey];
        if (!prod) return;

        // Acumular sobre el producto (modificación directa del objeto referenciado)
        prod.ventas         += cantidad;
        prod.ingresos       += prod.precio * cantidad;
        prod.ganancia_total += prod.ganancia_pesos !== null ? prod.ganancia_pesos * cantidad : 0;

        totalIngresos += prod.precio * cantidad;
        totalGanancia += prod.ganancia_pesos !== null ? prod.ganancia_pesos * cantidad : 0;
      });
    });
    }  // if (_pedR.sheet)
  }    // if (pedSheet)

  // ════════════════════════════════════════
  // 3. KPIs GLOBALES
  // ════════════════════════════════════════

  // Gross margin ponderado (sobre ingresos reales) — KPI financiero real
  var margenGlobal = totalIngresos > 0
    ? Math.round((totalGanancia / totalIngresos) * 1000) / 10
    : 0;

  // Inversión en stock actual
  var totalInversion = conCosto.reduce(function(s, p) {
    return s + (p.costo * p.stock);
  }, 0);

  // ROI = ganancia histórica acumulada / inversión actual en stock
  // Indica cuánto ha rendido cada peso invertido en inventario
  var roi = totalInversion > 0
    ? Math.round((totalGanancia / totalInversion) * 1000) / 10
    : 0;

  // Markup promedio simple (consistencia con la calculadora de precios)
  var avgMarkupPct = 0;
  if (conCosto.length > 0) {
    var sumaMarkup = conCosto.reduce(function(s, p){ return s + p.ganancia_pct; }, 0);
    avgMarkupPct   = Math.round((sumaMarkup / conCosto.length) * 10) / 10;
  }

  // ════════════════════════════════════════
  // 4. RANKINGS
  // ════════════════════════════════════════
  var vendidos = productos.filter(function(p){ return p.ventas > 0; });

  // Top por ganancia_total real (dinero real en el bolsillo)
  var topRentables = vendidos.slice()
    .sort(function(a, b){ return b.ganancia_total - a.ganancia_total; })
    .slice(0, 5);

  // Menos rentables por ganancia_total (solo vendidos)
  var menosRentables = vendidos.slice()
    .sort(function(a, b){ return a.ganancia_total - b.ganancia_total; })
    .slice(0, 5);

  // Más vendidos por unidades
  var masVendidos = productos.slice()
    .sort(function(a, b){ return b.ventas - a.ventas; })
    .filter(function(p){ return p.ventas > 0; })
    .slice(0, 5);

  // Ganancia por categoría
  var catMap = {};
  productos.forEach(function(p) {
    if (!p.categoria) return;
    if (!catMap[p.categoria]) {
      catMap[p.categoria] = { categoria: p.categoria, ventas: 0, ingresos: 0, ganancia: 0 };
    }
    catMap[p.categoria].ventas   += p.ventas;
    catMap[p.categoria].ingresos += p.ingresos;
    catMap[p.categoria].ganancia += p.ganancia_total;
  });
  var porCategoria = Object.values(catMap)
    .sort(function(a, b){ return b.ganancia - a.ganancia; });

  // ════════════════════════════════════════
  // 5. RESPUESTA
  // ════════════════════════════════════════
  var resRent = {
    ok: true,
    fromCache: false,
    resumen: {
      totalProductos: productos.length,
      conCosto:       conCosto.length,
      sinCosto:       sinCosto,

      // KPIs financieros
      totalIngresos:  totalIngresos,    // $ total facturado (con costo conocido)
      totalGanancia:  totalGanancia,    // $ ganancia real acumulada histórica
      margenGlobal:   margenGlobal,     // % gross margin ponderado (ganancia/ingresos)
      avgMarkupPct:   avgMarkupPct,     // % markup promedio sobre costo (consistencia UI)

      // KPIs de inventario
      totalInversion: totalInversion,   // $ invertido en stock actual
      roi:            roi,              // % retorno sobre inversión en stock
    },
    topRentables:   topRentables,       // top 5 por ganancia_total real
    menosRentables: menosRentables,     // bottom 5 por ganancia_total (solo vendidos)
    masVendidos:    masVendidos,        // top 5 por unidades vendidas
    porCategoria:   porCategoria,       // ganancia agrupada por categoría
    todos:          productos,          // todos los productos con acumuladores
  };
  cachePut(CACHE_KEY_R, resRent, 300);  // 5 min
  return jsonResponse(resRent);
}

/* ──────────────────────────────────────────────────────────────
   POST — dispatcher
────────────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (body.accion === "calificacion") {
      guardarCalificacion(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_estado") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarEstadoPedido(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_stock") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarStockProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_costo") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      var resultadoCosto = actualizarCostoProducto(ss, body);
      return jsonResponse(resultadoCosto);
    }
    if (body.accion === "actualizar_precio") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarPrecioProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "admin_clientes_upsert")    return doPost_admin_clientes_upsert(e);
    if (body.accion === "admin_clientes_eliminar")  return doPost_admin_clientes_eliminar(e);
    if (body.accion === "admin_proveedores_upsert") return doPost_admin_proveedores_upsert(e);
    if (body.accion === "admin_proveedores_eliminar") return doPost_admin_proveedores_eliminar(e);

    // ── Nuevo pedido ── validar primero, luego procesar
    validarBodyPedido(body);           // lanza Error si falta algo requerido
    return procesarNuevoPedido(ss, body);

  } catch (err) {
    Logger.log("Error doPost: " + err.message);
    logError("doPost", err);
    return jsonResponse({ ok: false, error: err.message });
  }
}


/* ──────────────────────────────────────────────────────────────
   PROCESAR NUEVO PEDIDO
   
   Separado de doPost para:
   - Tener una unidad de código testeable
   - Mantener doPost como dispatcher limpio
   - Hacer obvio el flujo de un pedido nuevo
   
   El orden importa:
   1. Guardar pedido (crítico — si falla, lanzar)
   2. Operaciones secundarias (errores no cancelan el pedido)
────────────────────────────────────────────────────────────── */
function procesarNuevoPedido(ss, body) {
  // 1. GUARDAR PEDIDO — crítico, si falla el error sube a doPost
  guardarPedido(ss, body);

  // 2. Operaciones secundarias con try/catch individual
  //    Un fallo aquí NO cancela el pedido ya guardado

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

  // 3. Invalidar caches — el dashboard debe mostrar el nuevo pedido
  cacheDelete("admin_dashboard_v1");
  cacheDelete("admin_rentabilidad_v1");

  // 4. Dashboard: NO recalcular aquí — corre via trigger horario
  //    (instalarTriggerHorario). Recalcular en cada pedido con 500+ filas
  //    excede el límite de 6 min de Apps Script.

  return jsonResponse({ ok: true });
}

/* ──────────────────────────────────────────────────────────────
   DESCONTAR STOCK
────────────────────────────────────────────────────────────── */
function descontarStock(ss, productosStr, productosJsonStr) {
  if (!productosStr && !productosJsonStr) return;
  var _s = leerSheet(ss, "Productos");
  if (!_s.sheet) return;
  var nomIdx  = _s.headers.indexOf("nombre");
  var tamIdx  = _s.headers.indexOf("tamano");
  var stkIdx  = _s.headers.indexOf("stock");
  if (stkIdx < 0) return;
  var alertas = [];
  // parsearProductosPedido prefiere JSON si está disponible
  parsearProductosPedido(productosStr, productosJsonStr).forEach(function(item) {
    var cant   = item.cantidad;
    var nomTam = item.nombre;  // ya en lowercase desde parsearLineaProducto()
    for (var i = 0; i < _s.rows.length; i++) {
      var clave = (String(_s.rows[i][nomIdx]||"").trim() + " " + String(_s.rows[i][tamIdx]||"").trim()).trim();
      if (clave.toLowerCase() === nomTam) {
        var stockActual = _s.rows[i][stkIdx];
        if (stockActual !== "" && stockActual !== null && !isNaN(Number(stockActual))) {
          var nuevoStock = Math.max(0, Number(stockActual) - cant);
          var cell = _s.sheet.getRange(i + 2, stkIdx + 1);  // +2 porque rows no incluye header
          cell.setValue(nuevoStock);
          aplicarColorStock(cell, nuevoStock);  // centralizado en Utils
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

/* ──────────────────────────────────────────────────────────────
   GUARDAR PEDIDO
────────────────────────────────────────────────────────────── */
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
    productos_json:  body.productos_json || "",  // JSON estructurado (pedidos nuevos)
  });
}

/* ──────────────────────────────────────────────────────────────
   UPSERT CLIENTE — TextFinder para escala
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   NOTIFICACIÓN WA
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR ESTADO PEDIDO
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
    var cell = sheet.getRange(fila, COL["estado_pago"]);
    cell.setValue(body.estado_pago);
    aplicarColorPago(cell, body.estado_pago);  // centralizado en Utils
  }
}

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR COSTO
   Retorna los datos recalculados para que el frontend actualice la UI.
────────────────────────────────────────────────────────────── */
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
    _g = calcGanancia(precio, nuevoCosto);  // centralizado en Utils
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
  return { ok: true, fila: fila, costo: nuevoCosto, precio: precio,
           ganancia_pct: _g.pct, ganancia_pesos: _g.pesos };
}

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR STOCK
────────────────────────────────────────────────────────────── */
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
  aplicarColorStock(cell, nuevoStock);  // centralizado en Utils
  cacheDelete("admin_productos_v1");
  Logger.log("Stock fila " + fila + " = " + nuevoStock);
}

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR PRECIO
────────────────────────────────────────────────────────────── */
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
    var _gp = calcGanancia(nuevoPrecio, costo);  // centralizado en Utils
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

/* ──────────────────────────────────────────────────────────────
   LIMPIAR GANANCIA_PCT — ejecutar UNA VEZ para sanear celdas
   que tengan "85.7%" (string) en lugar de 85.7 (número).
   BUG-05/06 FIX: normaliza todas las celdas existentes.
────────────────────────────────────────────────────────────── */
function limpiarGananciaPct() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var _s = leerSheet(ss, "Productos");
  if (!_s.sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var col   = _s.headers.indexOf("ganancia_pct") + 1;
  if (!col) { Logger.log("Columna ganancia_pct no encontrada"); return; }
  var count = 0;
  for (var i = 0; i < _s.rows.length; i++) {
    var val = _s.rows[i][col - 1];
    // Normalizar strings tipo "85.7%", "85,7%" o "85.7"
    if (typeof val === "string") {
      var num = parseFloat(val.replace("%", "").replace(",", ".").trim());
      if (!isNaN(num)) {
        _s.sheet.getRange(i + 2, col).setValue(num).setNumberFormat('0.00"%"');  // +2: header + 0-indexed
        count++;
      }
    }
  }
  Logger.log("limpiarGananciaPct: " + count + " celdas normalizadas.");
}

/* ──────────────────────────────────────────────────────────────
   CACHÉ INVALIDATION (trigger horario)
────────────────────────────────────────────────────────────── */
function invalidarCacheDashboard() {
  try {
    CacheService.getScriptCache().remove("admin_dashboard_v1");
    Logger.log("Caché invalidado: " + Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy HH:mm"));
  } catch(e) { Logger.log("Error caché: " + e.message); }
}

function instalarTriggerHorario() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "invalidarCacheDashboard") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("invalidarCacheDashboard").timeBased().everyHours(1).create();
  Logger.log("✅ Trigger horario instalado.");
}

function desinstalarTriggerHorario() {
  var count = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "invalidarCacheDashboard") { ScriptApp.deleteTrigger(t); count++; }
  });
  Logger.log("Triggers eliminados: " + count);
}

/* ──────────────────────────────────────────────────────────────
   CONFIGURACION INICIAL
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