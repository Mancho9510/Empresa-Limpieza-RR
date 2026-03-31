/* ──────────────────────────────────────────────────────────────
   LRR_Ctrl_Dashboard.gs
   Controlador para Dashboard y APIs relacionadas con métricas
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

    var esVentaReal = (estP === "PAGADO" || estP === "CONTRA ENTREGA");
    
    if (esVentaReal) {
      totGen += total;
    }

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
        if (fD===hoyDia&&fM===hoyMes&&fA===hoyAnio){
          cntHoy++;
          if (esVentaReal) totHoy += total;
        }
        if (fM===hoyMes&&fA===hoyAnio){
          cntMes++;
          if (esVentaReal) totMes += total;
        }
        var diff=Math.floor((hoy.getTime()-fd.getTime())/(1000*60*60*24));
        if (diff>=0&&diff<56){
          var sem=Math.floor(diff/7);
          var semKey=sem===0?"Esta semana":sem===1?"Sem anterior":"Hace "+sem+" sem";
          if (semanas.hasOwnProperty(semKey) && esVentaReal) semanas[semKey] += total;
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

function doGet_admin_rentabilidad(e, ss) {
  if (!verificarClave(e.parameter.clave || "")) {
    return jsonResponse({ ok: false, error: "No autorizado" });
  }

  var CACHE_KEY_R = "admin_rentabilidad_v1";
  var forceRefreshR = e.parameter.refresh === "1";
  if (!forceRefreshR) {
    var cachedR = cacheGet(CACHE_KEY_R);
    if (cachedR) { cachedR.fromCache = true; return jsonResponse(cachedR); }
  }

  var prodSheet = ss.getSheetByName("Productos");
  var pedSheet  = ss.getSheetByName("Pedidos");
  if (!prodSheet) return jsonResponse({ ok: false, error: "Sin hoja Productos" });

  var _prod = leerSheet(ss, "Productos");
  if (!_prod.sheet) return jsonResponse({ ok: false, error: "Sin hoja Productos" });
  var PC      = {};
  _prod.headers.forEach(function(h, i){ PC[h] = i; });

  var productos    = [];
  var productosMap = {};

  _prod.rows.forEach(function(r, i) {
    var nombre = String(r[PC["nombre"]] || "").trim();
    var tamano = String(r[PC["tamano"]] || "").trim();
    var key    = (nombre + " " + tamano).toLowerCase();
    var precio = Number(r[PC["precio"]]) || 0;
    var costoRaw = r[PC["costo"]];
    var costo = (costoRaw !== "" && costoRaw !== null) ? (Number(costoRaw) || 0) : 0;
    var stockRaw = r[PC["stock"]];
    var stock = (stockRaw !== "" && stockRaw !== null) ? Math.max(0, Number(stockRaw) || 0) : 0;

    var _g = calcGanancia(precio, costo);

    var producto = {
      fila:            i + 2,
      nombre:          nombre,
      tamano:          tamano,
      categoria:       String(r[PC["categoria"]] || ""),
      precio:          precio,
      costo:           costo,
      stock:           stock,
      ganancia_pct:    _g.pct,
      ganancia_pesos:  _g.pesos,
      ventas:          0,
      ingresos:        0,
      ganancia_total:  0,
    };

    productos.push(producto);
    if (key) productosMap[key] = producto;
  });

  var conCosto = productos.filter(function(p){ return p.costo > 0 && p.precio > 0; });
  var sinCosto = productos.length - conCosto.length;

  var totalIngresos = 0;
  var totalGanancia = 0;

  if (pedSheet) {
    var _pedR = leerSheet(ss, "Pedidos");
    if (_pedR.sheet && _pedR.rows.length > 0) {
    var pedPC = {};
    _pedR.headers.forEach(function(h, i){ pedPC[h] = i; });

    _pedR.rows.forEach(function(r) {
      var estP = String(r[pedPC["estado_pago"]] || "").toUpperCase();
      if (estP !== "PAGADO" && estP !== "CONTRA ENTREGA") {
        return;
      }

      var descuentoPedido = Number(r[pedPC["descuento"]]) || 0;
      var subtotalPedido  = Number(r[pedPC["subtotal"]])  || 0;
      var prodsStr = String(r[pedPC["productos"]] || "");
      var pedPC_json = _pedR.headers.indexOf("productos_json");
      var jsonStr = (pedPC_json >= 0) ? String(r[pedPC_json] || "") : "";
      
      var productosDelPedido = parsearProductosPedido(prodsStr, jsonStr);

      if (subtotalPedido <= 0 && descuentoPedido > 0) {
        subtotalPedido = productosDelPedido.reduce(function(acc, item) {
          var _p = productosMap[item.nombre];
          return acc + (_p ? _p.precio * item.cantidad : 0);
        }, 0);
      }

      productosDelPedido.forEach(function(item) {
        var cantidad  = item.cantidad;
        var nombreKey = item.nombre;
        var prod      = productosMap[nombreKey];
        if (!prod) return;

        var ingresoPrBruto = (prod.precio * cantidad);
        var descuentoProrrateado = 0;
        if (descuentoPedido > 0 && subtotalPedido > 0) {
          descuentoProrrateado = (descuentoPedido * (ingresoPrBruto / subtotalPedido));
        } else if (descuentoPedido > 0 && subtotalPedido <= 0) {
          descuentoProrrateado = (descuentoPedido / productosDelPedido.length);
        }

        var ingresoNetoProducto = ingresoPrBruto - descuentoProrrateado;
        var gananciaNeta        = ingresoNetoProducto - (prod.costo * cantidad);

        prod.ventas         += cantidad;
        prod.ingresos       += ingresoNetoProducto;
        prod.ganancia_total += gananciaNeta;

        totalIngresos += ingresoNetoProducto;
        totalGanancia += gananciaNeta;
      });
    });
    }
  }

  var margenGlobal = totalIngresos > 0
    ? Math.round((totalGanancia / totalIngresos) * 1000) / 10
    : 0;

  var totalInversion = conCosto.reduce(function(s, p) {
    return s + (p.costo * p.stock);
  }, 0);

  var roi = totalInversion > 0
    ? Math.round((totalGanancia / totalInversion) * 1000) / 10
    : 0;

  var avgMarkupPct = 0;
  if (conCosto.length > 0) {
    var sumaMarkup = conCosto.reduce(function(s, p){ return s + p.ganancia_pct; }, 0);
    avgMarkupPct   = Math.round((sumaMarkup / conCosto.length) * 10) / 10;
  }

  var vendidos = productos.filter(function(p){ return p.ventas > 0; });
  var topRentables = vendidos.slice().sort(function(a, b){ return b.ganancia_total - a.ganancia_total; }).slice(0, 5);
  var menosRentables = vendidos.slice().sort(function(a, b){ return a.ganancia_total - b.ganancia_total; }).slice(0, 5);
  var masVendidos = productos.slice().sort(function(a, b){ return b.ventas - a.ventas; }).filter(function(p){ return p.ventas > 0; }).slice(0, 5);

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
  var porCategoria = Object.values(catMap).sort(function(a, b){ return b.ganancia - a.ganancia; });

  var resRent = {
    ok: true,
    fromCache: false,
    resumen: {
      totalProductos: productos.length,
      conCosto:       conCosto.length,
      sinCosto:       sinCosto,
      totalIngresos:  totalIngresos,
      totalGanancia:  totalGanancia,
      margenGlobal:   margenGlobal,
      avgMarkupPct:   avgMarkupPct,
      totalInversion: totalInversion,
      roi:            roi,
    },
    topRentables:   topRentables,
    menosRentables: menosRentables,
    masVendidos:    masVendidos,
    porCategoria:   porCategoria,
    todos:          productos,
  };
  cachePut(CACHE_KEY_R, resRent, 300);
  return jsonResponse(resRent);
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
