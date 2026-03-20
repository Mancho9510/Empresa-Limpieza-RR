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
 *  → configuracionInicial()
 * ═══════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════════════════════════════
var CONFIG_WA = {
  NUMERO:  "573503443140",
  API_KEY: "",     // Pega aquí SOLO el número de key de CallMeBot (ej: "4942289")
  ACTIVO:  false,  // Cambiar a true cuando tengas la API key
};

function getSS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No hay spreadsheet activo.");
  return ss;
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
   GET
────────────────────────────────────────────────────────────── */
function doGet(e) {
  try {
    var action = e.parameter.action || "";
    var ss     = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "productos") {
      var sheet = ss.getSheetByName("Productos");
      if (!sheet) return jsonResponse({ ok: false, error: "Hoja Productos no encontrada" });
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var rows = data.slice(1)
        .filter(function(row) { return row[0] !== "" && row[0] !== null; })
        .map(function(row) {
          var obj = {};
          headers.forEach(function(h, i) { obj[String(h).trim()] = row[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, data: rows });
    }

    if (action === "cupon") {
      var code   = (e.parameter.code || "").toUpperCase().trim();
      var cSheet = ss.getSheetByName("Cupones");
      if (!cSheet) return jsonResponse({ ok: false, cupon: null });
      var cData = cSheet.getDataRange().getValues();
      var cHdr  = cData[0];
      var COL   = {};
      cHdr.forEach(function(h, i) { COL[String(h).toLowerCase().trim()] = i; });
      var found = null;
      cData.slice(1).forEach(function(r) {
        if (String(r[COL["codigo"]] || "").toUpperCase() === code) found = r;
      });
      if (!found) return jsonResponse({ ok: false, cupon: null });
      var activo = String(found[COL["activo"]]).toLowerCase() === "true";
      var uses   = Number(found[COL["usos_actuales"]]) || 0;
      var maxU   = found[COL["usos_maximos"]] !== "" ? Number(found[COL["usos_maximos"]]) : Infinity;
      var expiry = found[COL["vencimiento"]];
      if (!activo) return jsonResponse({ ok: false, cupon: null });
      if (uses >= maxU) return jsonResponse({ ok: false, cupon: null });
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

    if (action === "historial") {
      var tel    = normalizarTelefono(e.parameter.telefono || "");
      var pSheet = ss.getSheetByName("Pedidos");
      if (!pSheet || !tel) return jsonResponse({ ok: false, pedidos: [] });
      var pData = pSheet.getDataRange().getValues();
      var pHdr  = pData[0];
      var pCOL  = {};
      pHdr.forEach(function(h, i) { pCOL[String(h).toLowerCase().trim()] = i; });
      var pedidos = pData.slice(1)
        .filter(function(r) { return normalizarTelefono(r[pCOL["telefono"]] || "") === tel; })
        .slice(-10).reverse()
        .map(function(r) {
          var obj = {};
          pHdr.forEach(function(h, i) { obj[String(h).trim()] = r[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, pedidos: pedidos });
    }

    if (action === "estado") {
      var tel2   = normalizarTelefono(e.parameter.telefono || "");
      var eSheet = ss.getSheetByName("Pedidos");
      if (!eSheet || !tel2) return jsonResponse({ ok: false, pedidos: [] });
      var eData = eSheet.getDataRange().getValues();
      var eHdr  = eData[0];
      var eCOL  = {};
      eHdr.forEach(function(h, i) { eCOL[String(h).toLowerCase().trim()] = i; });
      var ultimos = eData.slice(1)
        .filter(function(r) { return normalizarTelefono(r[eCOL["telefono"]] || "") === tel2; })
        .slice(-3).reverse()
        .map(function(r) {
          var obj = {};
          eHdr.forEach(function(h, i) { obj[String(h).trim()] = r[i]; });
          return obj;
        });
      return jsonResponse({ ok: true, pedidos: ultimos });
    }

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
          ["imagen","imagen2","imagen3"].forEach(function(key) {
            if (obj[key]) obj[key] = sanitizeDriveUrl(String(obj[key]));
          });
          var precio = Number(obj["precio"]) || 0;
          var costo  = Number(obj["costo"])  || 0;
          if (precio > 0 && costo > 0) {
            obj["ganancia_calc"]  = Math.round(((precio - costo) / costo) * 100 * 10) / 10;
            obj["ganancia_pesos"] = precio - costo;
          } else {
            obj["ganancia_calc"]  = null;
            obj["ganancia_pesos"] = null;
          }
          return obj;
        });
      return jsonResponse({ ok: true, productos: pRows });
    }

    if (action === "admin_pedidos") {
      var clave = e.parameter.clave || "";
      if (clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      var aSheet = ss.getSheetByName("Pedidos");
      if (!aSheet) return jsonResponse({ ok: false, pedidos: [] });
      var aData = aSheet.getDataRange().getValues();
      var aHdr  = aData[0];
      var aCOL  = {};
      aHdr.forEach(function(h, i) { aCOL[String(h).toLowerCase().trim()] = i; });
      var pagina    = Math.max(1, parseInt(e.parameter.pagina || "1", 10));
      var porPagina = Math.min(100, Math.max(10, parseInt(e.parameter.por || "50", 10)));
      var busq      = String(e.parameter.q || "").toLowerCase();
      var allRows   = aData.slice(1).filter(function(r) { return r[0] !== "" && r[0] !== null; });
      var mapped = allRows.map(function(r, idx) {
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

    if (action === "admin_clientes")    return doGet_admin_clientes(e);
    if (action === "admin_proveedores") return doGet_admin_proveedores(e);

    if (action === "admin_dashboard") {
      var clave = e.parameter.clave || "";
      if (clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
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
      var ss2      = SpreadsheetApp.getActiveSpreadsheet();
      var pedSheet = ss2.getSheetByName("Pedidos");
      var cliSheet = ss2.getSheetByName("Clientes");
      var calSheet = ss2.getSheetByName("Calificaciones");
      var proSheet = ss2.getSheetByName("Productos");
      if (!pedSheet) return jsonResponse({ ok: false, error: "Hoja Pedidos no encontrada" });
      var pData = pedSheet.getDataRange().getValues();
      var pHdr  = pData[0]; var PC = {};
      pHdr.forEach(function(h,i){ PC[String(h).toLowerCase().trim()]=i; });
      var rows = pData.slice(1).filter(function(r){ return r[0]!==""; });
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
        var zona  = String(r[PC["zona_envio"]]||"Sin zona").replace(/\([^)]+\)/g,"").replace(/—.*/,"").replace(/\$/g,"").trim().split("—")[0].trim();
        var pago  = String(r[PC["pago"]]||"Sin datos");
        var nom   = String(r[PC["nombre"]]||"");
        var tel   = String(r[PC["telefono"]]||"");
        totGen += total;
        if (estP==="PENDIENTE"||estP==="") pend++;
        if (estP==="PAGADO") pagados++;
        if (estE==="Entregado") entregados++;
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
      var topProd  = Object.keys(prodCount).map(function(k){return{nombre:k,cant:prodCount[k]};}).sort(function(a,b){return b.cant-a.cant;}).slice(0,5);
      var topCli   = Object.keys(clienteCount).map(function(k){return{nombre:k,pedidos:clienteCount[k]};}).sort(function(a,b){return b.pedidos-a.pedidos;}).slice(0,5);
      var topZonas = Object.keys(zonaCount).map(function(k){return{zona:k,cnt:zonaCount[k]};}).sort(function(a,b){return b.cnt-a.cnt;}).slice(0,5);
      var topPagos = Object.keys(pagoCount).map(function(k){return{metodo:k,cnt:pagoCount[k]};}).sort(function(a,b){return b.cnt-a.cnt;});
      var avgRating=0, numResenas=0;
      if (calSheet&&calSheet.getLastRow()>1){
        var cData=calSheet.getDataRange().getValues();
        var cHdr=cData[0].map(function(h){return String(h).toLowerCase();});
        var si=cHdr.indexOf("estrellas");
        if (si>=0){
          var stars=cData.slice(1).map(function(r){return Number(r[si]);}).filter(function(v){return v>0;});
          numResenas=stars.length;
          if (stars.length>0) avgRating=parseFloat((stars.reduce(function(a,b){return a+b;},0)/stars.length).toFixed(1));
        }
      }
      var alertasStock=[];
      if (proSheet&&proSheet.getLastRow()>1){
        var prData=proSheet.getDataRange().getValues();
        var prHdr=prData[0].map(function(h){return String(h).toLowerCase().trim();});
        var ni=prHdr.indexOf("nombre"),ti=prHdr.indexOf("tamano"),sti=prHdr.indexOf("stock");
        if (sti>=0){
          prData.slice(1).forEach(function(r){
            if (!r[ni]) return;
            var sv=r[sti]; if (sv===""||sv===null) return;
            var sn=Number(sv); if (isNaN(sn)) return;
            var nivel = sn===0?"agotado":sn<=5?"bajo":null;
            if (nivel) alertasStock.push({nombre:String(r[ni]||"")+" "+String(r[ti]||""),stock:sn,nivel:nivel});
          });
        }
      }
      var numClientes=0, vip=0;
      if (cliSheet&&cliSheet.getLastRow()>1){
        numClientes=cliSheet.getLastRow()-1;
        var clData=cliSheet.getDataRange().getValues();
        var clHdr=clData[0].map(function(h){return String(h).toLowerCase();});
        var ti2=clHdr.indexOf("tipo");
        if (ti2>=0) clData.slice(1).forEach(function(r){ if (String(r[ti2]).toUpperCase().indexOf("VIP")>=0) vip++; });
      }
      var resultado = {
        ok: true, fromCache: false,
        generadoEn: Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy HH:mm"),
        kpis: { totHoy:totHoy, cntHoy:cntHoy, totMes:totMes, cntMes:cntMes,
                totGen:totGen, totalPedidos:rows.length, pend:pend, pagados:pagados,
                entregados:entregados, ticket:rows.length>0?Math.round(totGen/rows.length):0,
                numClientes:numClientes, vip:vip, avgRating:avgRating, numResenas:numResenas },
        semanas: semanas, topProd: topProd, topCli: topCli, topZonas: topZonas, topPagos: topPagos,
        alertasStock: alertasStock,
      };
      try { cache.put(CACHE_KEY, JSON.stringify(resultado), 300); } catch(ce) {}
      return jsonResponse(resultado);
    }

    if (action === "resenas") {
      var rSheet = ss.getSheetByName("Calificaciones");
      if (!rSheet || rSheet.getLastRow() < 2) return jsonResponse({ ok: true, resenas: [] });
      var rData = rSheet.getDataRange().getValues();
      var rHdr  = rData[0].map(function(h){ return String(h).toLowerCase().trim(); });
      var rCOL  = {}; rHdr.forEach(function(h,i){ rCOL[h]=i; });
      var resenas = rData.slice(1)
        .filter(function(r){ return r[rCOL["estrellas"]] >= 4 && r[0] !== ""; })
        .map(function(r){
          return {
            fecha:      String(r[rCOL["fecha"]]      || ""),
            nombre:     String(r[rCOL["nombre"]]     || "Cliente").split(" ")[0],
            estrellas:  Number(r[rCOL["estrellas"]]  || 5),
            comentario: String(r[rCOL["comentario"]] || ""),
          };
        })
        .sort(function(a,b){ return b.estrellas - a.estrellas; })
        .slice(0, 12);
      return jsonResponse({ ok: true, resenas: resenas });
    }

    if (action === "admin_rentabilidad") {
      var clave = e.parameter.clave || "";
      if (clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      var prodSheet = ss.getSheetByName("Productos");
      var pedSheet  = ss.getSheetByName("Pedidos");
      if (!prodSheet) return jsonResponse({ ok: false, error: "Sin hoja Productos" });
      var pData = prodSheet.getDataRange().getValues();
      var pH    = pData[0].map(function(h){ return String(h).toLowerCase().trim(); });
      var PC    = {}; pH.forEach(function(h,i){ PC[h]=i; });
      var productos = pData.slice(1).filter(function(r){ return r[0] !== ""; }).map(function(r, idx){
        var precio   = Number(r[PC["precio"]]) || 0;
        var costo    = Number(r[PC["costo"]])  || 0;
        var ganPct   = (precio > 0 && costo > 0) ? Math.round(((precio-costo)/costo)*100*10)/10 : null;
        var ganPesos = (precio > 0 && costo > 0) ? precio - costo : null;
        return {
          fila:          idx + 2,
          nombre:        String(r[PC["nombre"]]    || ""),
          tamano:        String(r[PC["tamano"]]    || ""),
          categoria:     String(r[PC["categoria"]] || ""),
          precio:        precio,
          costo:         costo,
          ganancia_pct:  ganPct,
          ganancia_pesos:ganPesos,
          stock:         r[PC["stock"]] !== undefined ? r[PC["stock"]] : "",
        };
      });
      var conCosto  = productos.filter(function(p){ return p.costo > 0 && p.precio > 0; });
      var sinCosto  = productos.filter(function(p){ return !p.costo || p.costo <= 0; }).length;
      var avgGanPct = 0, totalInversion = 0;
      if (conCosto.length > 0) {
        avgGanPct      = Math.round(conCosto.reduce(function(s,p){ return s + p.ganancia_pct; }, 0) / conCosto.length * 10) / 10;
        totalInversion = conCosto.reduce(function(s,p){ return s + (p.costo * (Number(p.stock) || 0)); }, 0);
      }
      var ordenados      = conCosto.slice().sort(function(a,b){ return b.ganancia_pct - a.ganancia_pct; });
      var topRentables   = ordenados.slice(0,5);
      var menosRentables = ordenados.slice(-3).reverse();
      var gananciaReal   = 0;
      if (pedSheet && pedSheet.getLastRow() > 1) {
        var pedData = pedSheet.getDataRange().getValues();
        var pedH    = pedData[0].map(function(h){ return String(h).toLowerCase().trim(); });
        var pedPC   = {}; pedH.forEach(function(h,i){ pedPC[h]=i; });
        pedData.slice(1).filter(function(r){ return r[0] !== ""; }).forEach(function(r){
          var prodsStr = String(r[pedPC["productos"]] || "");
          prodsStr.split("\n").forEach(function(linea){
            var cantMatch = linea.match(/Cant[^0-9]*([0-9]+)/i);
            if (!cantMatch) return;
            var cant   = parseInt(cantMatch[1], 10);
            var nomTam = linea.split("|")[0].trim().toLowerCase();
            conCosto.forEach(function(p){
              if ((p.nombre + " " + p.tamano).trim().toLowerCase() === nomTam && p.ganancia_pesos) {
                gananciaReal += p.ganancia_pesos * cant;
              }
            });
          });
        });
      }
      return jsonResponse({
        ok: true,
        resumen: { totalProductos: productos.length, conCosto: conCosto.length, sinCosto: sinCosto,
                   avgGanPct: avgGanPct, totalInversion: totalInversion, gananciaReal: gananciaReal },
        topRentables: topRentables, menosRentables: menosRentables, todos: productos,
      });
    }

    return jsonResponse({ ok: false, error: "Accion no reconocida: " + action });

  } catch(err) {
    Logger.log("Error en doGet: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

/* ──────────────────────────────────────────────────────────────
   POST
   FIX: try/catch individual en cada operación — si falla
   algo secundario (clientes, stock), el pedido ya está guardado
   y el error queda registrado en Logger sin afectar al cliente.
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
      if (body.clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarEstadoPedido(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_stock") {
      if (body.clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarStockProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_costo") {
      if (body.clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      var resultadoCosto = actualizarCostoProducto(ss, body);
      return jsonResponse(resultadoCosto);
    }
    if (body.accion === "actualizar_precio") {
      if (body.clave !== "LIMPIEZARR2025") return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarPrecioProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "admin_clientes_upsert")    return doPost_admin_clientes_upsert(e);
    if (body.accion === "admin_clientes_eliminar")  return doPost_admin_clientes_eliminar(e);
    if (body.accion === "admin_proveedores_upsert") return doPost_admin_proveedores_upsert(e);
    if (body.accion === "admin_proveedores_eliminar") return doPost_admin_proveedores_eliminar(e);

    // ── Nuevo pedido ─────────────────────────────────────────
    // guardarPedido es crítico — si falla, lanzar el error
    guardarPedido(ss, body);

    // Operaciones secundarias — try/catch individual para no perder el pedido
    try { if (body.telefono) upsertCliente(ss, body); }
    catch(e1) { Logger.log("⚠️ upsertCliente falló: " + e1.message); }

    try { if (body.cupon) incrementarUsoCupon(ss, body.cupon); }
    catch(e2) { Logger.log("⚠️ cupon falló: " + e2.message); }

    try { descontarStock(ss, body.productos); }
    catch(e3) { Logger.log("⚠️ descontarStock falló: " + e3.message); }

    try { notificarPedido(body); }
    catch(e4) { Logger.log("Email fallido: " + e4.message); }

    try { notificarWA(body); }
    catch(e5) { Logger.log("WA fallido: " + e5.message); }

    try { CacheService.getScriptCache().remove("admin_dashboard_v1"); }
    catch(e6) {}

    try { actualizarDashboard(ss); }
    catch(e7) { Logger.log("Dashboard fallido: " + e7.message); }

    return jsonResponse({ ok: true });

  } catch (err) {
    Logger.log("Error doPost: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

/* ──────────────────────────────────────────────────────────────
   DESCONTAR STOCK
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
  var alertas = [];
  String(productosStr).split("\n").filter(function(l){ return l.trim() !== ""; }).forEach(function(linea) {
    var cantMatch = linea.match(/Cant[^0-9]*([0-9]+)/i);
    if (!cantMatch) return;
    var cant   = parseInt(cantMatch[1], 10);
    var nomTam = linea.split("|")[0].trim();
    for (var i = 1; i < data.length; i++) {
      var clave = (String(data[i][nomIdx]||"").trim() + " " + String(data[i][tamIdx]||"").trim()).trim();
      if (clave.toLowerCase() === nomTam.toLowerCase()) {
        var stockActual = data[i][stkIdx];
        if (stockActual !== "" && stockActual !== null && !isNaN(Number(stockActual))) {
          var nuevoStock = Math.max(0, Number(stockActual) - cant);
          var cell = sheet.getRange(i + 1, stkIdx + 1);
          cell.setValue(nuevoStock);
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
  if (alertas.length > 0) {
    try { alertarStock(alertas); } catch(e) { Logger.log("Error alerta stock: " + e.message); }
  }
}

function alertarStock(alertas) {
  var email = Session.getActiveUser().getEmail();
  if (!email) return;
  var agotados = alertas.filter(function(a){ return a.nivel === "AGOTADO"; });
  var bajos    = alertas.filter(function(a){ return a.nivel === "BAJO"; });
  var subject  = agotados.length > 0 ? "🚨 AGOTADO — " + agotados[0].nombre + " | Limpieza RR" : "⚠️ Alerta de Stock — Limpieza RR";
  var html = "<h2 style='color:#991B1B;font-family:sans-serif'>⚠️ Alerta de Inventario — Limpieza RR</h2>";
  if (agotados.length > 0) {
    html += "<h3 style='color:#991B1B'>🚨 Productos AGOTADOS</h3><table style='border-collapse:collapse;width:100%;font-family:sans-serif'><tr style='background:#FEE2E2'><th style='padding:10px;text-align:left'>Producto</th><th style='padding:10px'>Stock</th></tr>";
    agotados.forEach(function(a){ html += "<tr><td style='padding:8px;border-bottom:1px solid #eee'>"+a.nombre+"</td><td style='padding:8px;text-align:center;color:#991B1B;font-weight:bold'>AGOTADO</td></tr>"; });
    html += "</table>";
  }
  if (bajos.length > 0) {
    html += "<h3 style='color:#854D0E;margin-top:20px'>⚠️ Stock Bajo (≤ 5 unidades)</h3><table style='border-collapse:collapse;width:100%;font-family:sans-serif'><tr style='background:#FEF9C3'><th style='padding:10px;text-align:left'>Producto</th><th style='padding:10px'>Unidades</th></tr>";
    bajos.forEach(function(a){ html += "<tr><td style='padding:8px;border-bottom:1px solid #eee'>"+a.nombre+"</td><td style='padding:8px;text-align:center;color:#854D0E;font-weight:bold'>"+a.stock+"</td></tr>"; });
    html += "</table>";
  }
  html += "<p style='color:#64748B;font-size:12px;margin-top:24px;font-family:sans-serif'>Actualiza en la hoja <strong>Productos</strong>.</p>";
  MailApp.sendEmail({ to: email, subject: subject, htmlBody: html });
}

function verificarStockCompleto() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var nomIdx  = headers.indexOf("nombre");
  var tamIdx  = headers.indexOf("tamano");
  var stkIdx  = headers.indexOf("stock");
  if (stkIdx < 0) { Logger.log("Columna stock no encontrada"); return; }
  var alertas = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][nomIdx]) continue;
    var sv = data[i][stkIdx];
    if (sv === "" || sv === null) continue;
    var sn = Number(sv); if (isNaN(sn)) continue;
    var clave = (String(data[i][nomIdx]||"").trim() + " " + String(data[i][tamIdx]||"").trim()).trim();
    if (sn === 0)     alertas.push({ nombre: clave, stock: 0,  nivel: "AGOTADO" });
    else if (sn <= 5) alertas.push({ nombre: clave, stock: sn, nivel: "BAJO" });
  }
  if (alertas.length === 0) { Logger.log("✅ Sin alertas."); return; }
  Logger.log("⚠️ Alertas: " + alertas.length);
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
    estado_envio: "Recibido",
    productos:    body.productos    || "",
  });
}

/* ──────────────────────────────────────────────────────────────
   UPSERT CLIENTE — FIX: TextFinder en lugar de bucle for
   Más rápido con 500+ clientes. Sin variables duplicadas.
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

  // Leer headers para mapear columnas por nombre
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var COL = {};
  headers.forEach(function(h, i) { COL[String(h).toLowerCase().trim()] = i + 1; });

  // TextFinder — busca el teléfono directo en la columna, sin recorrer todo
  var lastRow    = sheet.getLastRow();
  var clienteRow = -1;
  if (lastRow >= 2) {
    var telColIdx = COL["telefono"] || 4;
    var finder    = sheet.getRange(2, telColIdx, lastRow - 1, 1)
                         .createTextFinder(tel)
                         .matchEntireCell(true);
    var found     = finder.findNext();
    clienteRow    = found ? found.getRow() : -1;
  }

  if (clienteRow === -1) {
    // NUEVO CLIENTE
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
    // CLIENTE EXISTENTE
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
  if (pedidos >= 3  || gastado >= 150000) return "Recurrente";
  if (pedidos >= 2)                        return "Recurrente";
  return "Nuevo";
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

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

/* ──────────────────────────────────────────────────────────────
   NOTIFICACIÓN WHATSAPP
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
    Logger.log("WA notify status: " + resp.getResponseCode());
  } catch(err) {
    Logger.log("WA notify error: " + err.message);
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
  if (body.estado_envio && COL["estado_envio"]) sheet.getRange(fila, COL["estado_envio"]).setValue(body.estado_envio);
  if (body.estado_pago  && COL["estado_pago"])  {
    sheet.getRange(fila, COL["estado_pago"]).setValue(body.estado_pago);
    var cell = sheet.getRange(fila, COL["estado_pago"]);
    var val  = String(body.estado_pago).toUpperCase();
    if (val === "PAGADO")          cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    else if (val === "CONTRA ENTREGA") cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
    else                           cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  }
}

/* ──────────────────────────────────────────────────────────────
   ACTUALIZAR COSTO
   FIX: retorna ganancia calculada para que el frontend
   pueda actualizar la tabla sin recargar desde el servidor.
   FIX: setNumberFormat correcto — número puro con símbolo %
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
  var ganancia = null, ganPesos = null, precio = 0;
  if (gananciaCol && precioCol) {
    precio = Number(sheet.getRange(fila, precioCol).getValue());
    if (precio > 0 && nuevoCosto > 0) {
      ganancia = Math.round(((precio - nuevoCosto) / nuevoCosto) * 100 * 10) / 10;
      ganPesos = precio - nuevoCosto;
      var ganCell = sheet.getRange(fila, gananciaCol);
      ganCell.clearFormat();
      ganCell.setValue(ganancia);
      ganCell.setNumberFormat('0.00"%"');  // muestra 85,70% pero guarda 85.7
      if (ganancia < 10)      ganCell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
      else if (ganancia < 30) ganCell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
      else                    ganCell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    }
  }
  Logger.log("Costo actualizado fila " + fila + " = " + nuevoCosto);
  return { ok: true, fila: fila, costo: nuevoCosto, precio: precio, ganancia_pct: ganancia, ganancia_pesos: ganPesos };
}

/* ──────────────────────────────────────────────────────────────
   LIMPIAR GANANCIA PCT
   FIX: replace(",", ".") para que parseFloat funcione correctamente.
   Ejecutar UNA VEZ para normalizar celdas con "85,7%" → 85.7
────────────────────────────────────────────────────────────── */
function limpiarGananciaPct() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Productos");
  var data  = sheet.getDataRange().getValues();
  var hdr   = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var col   = hdr.indexOf("ganancia_pct") + 1;
  if (!col) { Logger.log("Columna ganancia_pct no encontrada"); return; }
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    var val = data[i][col - 1];
    if (typeof val === "string" && val.includes("%")) {
      // FIX: primero quitar %, luego reemplazar , por . para que parseFloat funcione
      var num = parseFloat(val.replace("%", "").replace(",", ".").trim());
      if (!isNaN(num)) {
        sheet.getRange(i + 1, col).setValue(num).setNumberFormat('0.00"%"');
        count++;
      }
    }
  }
  Logger.log("Limpieza completada: " + count + " celdas corregidas");
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
  if (nuevoStock === "" || nuevoStock === null)    cell.setBackground("#FFFFFF").setFontColor("#0F172A").setFontWeight("normal");
  else if (Number(nuevoStock) === 0)               cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  else if (Number(nuevoStock) <= 5)                cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
  else                                             cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("normal");
  Logger.log("Stock actualizado fila " + fila + " = " + nuevoStock);
}

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
   ACTUALIZAR PRECIO
   FIX: setValue(ganancia) en lugar de ganancia + "%" + setNumberFormat
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
    if (costo > 0 && nuevoPrecio > 0) {
      var ganancia = Math.round(((nuevoPrecio - costo) / costo) * 100 * 10) / 10;
      var ganCell  = sheet.getRange(fila, gananciaCol);
      ganCell.clearFormat();
      ganCell.setValue(ganancia);
      ganCell.setNumberFormat('0.00"%"');  // FIX: número puro, no string con %
      if (ganancia < 10)      ganCell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
      else if (ganancia < 30) ganCell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
      else                    ganCell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    }
  }
  Logger.log("Precio actualizado fila " + fila + " = " + nuevoPrecio);
}