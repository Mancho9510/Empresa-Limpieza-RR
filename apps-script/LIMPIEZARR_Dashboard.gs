/* ══════════════════════════════════════════════════════════════
   LIMPIEZA RR — Dashboard, Cupones, Calificaciones, Email
   Archivo: LIMPIEZARR_Dashboard.gs
   Funciones:
   - refrescarDashboard()  → Ejecutar manualmente
   - inicializarCupones()  → Ejecutar una vez
   - setupCompleto()       → Ejecutar una vez al iniciar
══════════════════════════════════════════════════════════════ */

function refrescarDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) { Logger.log("ERROR: No hay spreadsheet activo."); return; }
  actualizarDashboard(ss);
  Logger.log("Dashboard actualizado correctamente.");
}

function getDashboardSheet(ss) {
  var dashboard = ss.getSheetByName("Dashboard");
  var legacy = ss.getSheetByName("Resumen");

  if (dashboard) return dashboard;
  if (legacy) {
    legacy.setName("Dashboard");
    return legacy;
  }

  dashboard = ss.insertSheet("Dashboard");
  ss.setActiveSheet(dashboard);
  ss.moveActiveSheet(1);
  return dashboard;
}

function inicializarDashboard() {
  actualizarDashboard(SpreadsheetApp.getActiveSpreadsheet());
}

/* ──────────────────────────────────────────────────────────────
   DASHBOARD COMPLETO
────────────────────────────────────────────────────────────── */
function actualizarDashboard(ss) {
  try {
    if (!ss) { Logger.log("ERROR: ss undefined"); return; }

    var dash = getDashboardSheet(ss);
    dash.clearContents();
    dash.clearFormats();

    var pedidos  = ss.getSheetByName("Pedidos");
    var clientes = ss.getSheetByName("Clientes");
    var califs   = ss.getSheetByName("Calificaciones");
    var prods    = ss.getSheetByName("Productos");
    if (!pedidos) { Logger.log("Hoja Pedidos no encontrada"); return; }

    var pData    = pedidos.getDataRange().getValues();
    var pHeaders = pData[0];
    var PC = {};
    pHeaders.forEach(function(h, i) { PC[String(h).toLowerCase().trim()] = i; });
    var rows = pData.slice(1).filter(function(r) { return r[0] !== "" && r[0] !== null; });

    var hoy     = new Date();
    var hoyDia  = Number(Utilities.formatDate(hoy, "America/Bogota", "d"));
    var hoyMes  = Number(Utilities.formatDate(hoy, "America/Bogota", "M"));
    var hoyAnio = Number(Utilities.formatDate(hoy, "America/Bogota", "yyyy"));

    // ── Métricas generales ────────────────────────────────
    var totalHoy = 0, countHoy = 0;
    var totalMes = 0, countMes = 0;
    var totalGeneral = 0, pendientes = 0, pagados = 0, entregados = 0;
    var prodCount = {}, clienteCount = {}, zonaCount = {}, pagoCount = {};
    var ventasSemana = {}; // { "Lun 12/03": total }

    rows.forEach(function(r) {
      var rawFecha = r[PC["fecha"]];
      var total    = Number(r[PC["total"]]) || 0;
      var estado   = String(r[PC["estado_pago"]]  || "").toUpperCase();
      var estadoEnv= String(r[PC["estado_envio"]] || "");
      var prods2   = String(r[PC["productos"]]    || "");
      var zona     = String(r[PC["zona_envio"]]   || "Sin zona");
      var pago     = String(r[PC["pago"]]         || "Sin datos");
      var nombre   = String(r[PC["nombre"]]       || "");
      var tel      = String(r[PC["telefono"]]     || "");

      totalGeneral += total;
      if (estado === "PENDIENTE" || estado === "") pendientes++;
      if (estado === "PAGADO") pagados++;
      if (estadoEnv === "Entregado") entregados++;

      // Clientes frecuentes
      var claveCliente = nombre + (tel ? " (" + tel + ")" : "");
      if (claveCliente.trim()) clienteCount[claveCliente] = (clienteCount[claveCliente] || 0) + 1;

      // Zonas
      var zonaCorta = zona.replace(/\([^)]+\)/g, "").replace(/—.*/, "").trim();
      if (zonaCorta) zonaCount[zonaCorta] = (zonaCount[zonaCorta] || 0) + 1;

      // Métodos de pago
      if (pago) pagoCount[pago] = (pagoCount[pago] || 0) + 1;

      // Fechas
      try {
        var fd = parseLimpiezaDate(rawFecha);
        if (fd && !isNaN(fd.getTime())) {
          var fD = Number(Utilities.formatDate(fd, "America/Bogota", "d"));
          var fM = Number(Utilities.formatDate(fd, "America/Bogota", "M"));
          var fA = Number(Utilities.formatDate(fd, "America/Bogota", "yyyy"));
          if (fD === hoyDia && fM === hoyMes && fA === hoyAnio) { totalHoy += total; countHoy++; }
          if (fM === hoyMes && fA === hoyAnio) { totalMes += total; countMes++; }

          // Ventas últimas 8 semanas (por semana)
          var msPerDay   = 1000 * 60 * 60 * 24;
          var diffDays   = Math.floor((hoy.getTime() - fd.getTime()) / msPerDay);
          if (diffDays >= 0 && diffDays < 56) {
            var semana = Math.floor(diffDays / 7);
            var semKey = "Sem -" + semana;
            if (semana === 0) semKey = "Esta semana";
            else if (semana === 1) semKey = "Sem anterior";
            else semKey = "Hace " + semana + " sem";
            ventasSemana[semKey] = (ventasSemana[semKey] || 0) + total;
          }
        }
      } catch(e) {}

      // Productos más vendidos
      prods2.split("\n").forEach(function(line) {
        var cantMatch = line.match(/Cant[^0-9]*([0-9]+)/i);
        var cant = cantMatch ? parseInt(cantMatch[1], 10) : 1;
        var partes = line.split("|");
        if (partes.length > 0) {
          var k = partes[0].trim();
          if (k) prodCount[k] = (prodCount[k] || 0) + cant;
        }
      });
    });

    // ── Top 5 productos ──────────────────────────────────
    var topProd = Object.keys(prodCount)
      .map(function(k) { return [k, prodCount[k]]; })
      .sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

    // ── Top 5 clientes frecuentes ────────────────────────
    var topClientes = Object.keys(clienteCount)
      .map(function(k) { return [k, clienteCount[k]]; })
      .sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

    // ── Top zonas ────────────────────────────────────────
    var topZonas = Object.keys(zonaCount)
      .map(function(k) { return [k, zonaCount[k]]; })
      .sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

    // ── Top métodos de pago ──────────────────────────────
    var topPagos = Object.keys(pagoCount)
      .map(function(k) { return [k, pagoCount[k]]; })
      .sort(function(a, b) { return b[1] - a[1]; });

    // ── Calificaciones ───────────────────────────────────
    var avgRating = 0, numResenas = 0;
    if (califs && califs.getLastRow() > 1) {
      var cData   = califs.getDataRange().getValues();
      var cHdr    = cData[0].map(function(h) { return String(h).toLowerCase(); });
      var starIdx = cHdr.indexOf("estrellas");
      if (starIdx >= 0) {
        var stars = cData.slice(1).map(function(r) { return Number(r[starIdx]); }).filter(function(v) { return v > 0; });
        numResenas = stars.length;
        if (stars.length > 0) avgRating = (stars.reduce(function(a,b){return a+b;},0) / stars.length);
      }
    }

    // ── Stock bajo/agotado ────────────────────────────────
    var agotados = [], stockBajo = [];
    if (prods && prods.getLastRow() > 1) {
      var pProd    = prods.getDataRange().getValues();
      var pHdrP    = pProd[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var nomIdxP  = pHdrP.indexOf("nombre");
      var tamIdxP  = pHdrP.indexOf("tamano");
      var stkIdxP  = pHdrP.indexOf("stock");
      if (stkIdxP >= 0) {
        pProd.slice(1).forEach(function(r) {
          if (!r[nomIdxP]) return;
          var sv = r[stkIdxP];
          if (sv === "" || sv === null) return;
          var sn = Number(sv);
          if (isNaN(sn)) return;
          var nm = String(r[nomIdxP] || "").trim() + " " + String(r[tamIdxP] || "").trim();
          if (sn === 0) agotados.push(nm);
          else if (sn <= 5) stockBajo.push(nm + " (" + sn + ")");
        });
      }
    }

    // ── Ticket promedio ──────────────────────────────────
    var ticketProm = rows.length > 0 ? Math.round(totalGeneral / rows.length) : 0;
    var fechaStr   = Utilities.formatDate(hoy, "America/Bogota", "dd/MM/yyyy HH:mm");

    // ══ ESCRIBIR DATOS EN EL SHEET ═══════════════════════

    var COL_A = 1, COL_B = 2, COL_C = 3, COL_D = 4;
    var fila  = 1;

    // Título principal
    dash.getRange(fila, 1, 1, 4).merge()
      .setValue("LIMPIEZA RR — Dashboard de Ventas")
      .setBackground("#0D9488").setFontColor("#FFFFFF")
      .setFontWeight("bold").setFontSize(14)
      .setHorizontalAlignment("center");
    dash.setRowHeight(fila, 40); fila++;

    dash.getRange(fila, 1, 1, 4).merge()
      .setValue("Actualizado: " + fechaStr)
      .setBackground("#0F766E").setFontColor("#CCFBF1")
      .setFontSize(9).setHorizontalAlignment("center");
    fila += 2;

    // ── Fila de métricas clave (KPIs) ────────────────────
    function kpiCell(r, c, lbl, val, bg, fg) {
      dash.getRange(r, c).setValue(lbl).setBackground(bg).setFontColor(fg || "#fff")
        .setFontWeight("bold").setFontSize(8).setHorizontalAlignment("center");
      dash.getRange(r+1, c).setValue(val).setBackground(bg).setFontColor(fg || "#fff")
        .setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center");
    }
    kpiCell(fila, 1, "PEDIDOS HOY",       countHoy,   "#0D9488");
    kpiCell(fila, 2, "VENTAS HOY",        "$ " + totalHoy.toLocaleString(), "#14B8A6");
    kpiCell(fila, 3, "PEDIDOS MES",       countMes,   "#0F766E");
    kpiCell(fila, 4, "VENTAS MES",        "$ " + totalMes.toLocaleString(), "#134E4A");
    dash.setRowHeight(fila,   22);
    dash.setRowHeight(fila+1, 32);
    fila += 3;

    kpiCell(fila, 1, "TOTAL PEDIDOS",     rows.length,   "#1E293B", "#F1F5F9");
    kpiCell(fila, 2, "VENTAS TOTALES",    "$ " + totalGeneral.toLocaleString(), "#1E293B", "#F1F5F9");
    kpiCell(fila, 3, "TICKET PROMEDIO",   "$ " + ticketProm.toLocaleString(), "#1E293B", "#F1F5F9");
    kpiCell(fila, 4, "ENTREGADOS",        entregados, "#1E293B", "#F1F5F9");
    dash.setRowHeight(fila,   22);
    dash.setRowHeight(fila+1, 32);
    fila += 3;

    // ── Sección: Ventas por semana ────────────────────────
    function secHeader(r, txt) {
      dash.getRange(r, 1, 1, 4).merge().setValue(txt)
        .setBackground("#CCFBF1").setFontColor("#0F766E")
        .setFontWeight("bold").setFontSize(10);
      dash.setRowHeight(r, 26);
    }

    secHeader(fila, "📈 VENTAS POR SEMANA (últimas 8 semanas)"); fila++;
    var semOrder = ["Esta semana","Sem anterior","Hace 2 sem","Hace 3 sem","Hace 4 sem","Hace 5 sem","Hace 6 sem","Hace 7 sem"];
    semOrder.forEach(function(sem) {
      var val = ventasSemana[sem] || 0;
      dash.getRange(fila, 1).setValue(sem).setFontSize(9).setBackground(fila%2===0?"#F0FDF9":"#FFFFFF");
      dash.getRange(fila, 2).setValue(val).setNumberFormat("$ #,##0")
        .setFontSize(9).setBackground(fila%2===0?"#F0FDF9":"#FFFFFF").setFontWeight("bold");
      // Mini barra visual
      var maxVal  = Math.max.apply(null, semOrder.map(function(s){ return ventasSemana[s]||0; })) || 1;
      var barLen  = Math.round((val / maxVal) * 20);
      var barStr  = Array(barLen+1).join("█") || "·";
      dash.getRange(fila, 3, 1, 2).merge().setValue(barStr)
        .setFontColor("#14B8A6").setFontSize(8)
        .setBackground(fila%2===0?"#F0FDF9":"#FFFFFF");
      fila++;
    });
    fila++;

    // ── Sección: Top productos ────────────────────────────
    secHeader(fila, "🏆 TOP 5 PRODUCTOS MÁS VENDIDOS"); fila++;
    dash.getRange(fila,1).setValue("Producto").setFontWeight("bold").setFontSize(8).setBackground("#F0FDF9");
    dash.getRange(fila,2).setValue("Unidades").setFontWeight("bold").setFontSize(8).setBackground("#F0FDF9").setHorizontalAlignment("center");
    dash.getRange(fila,3,1,2).merge().setValue("Participación").setFontWeight("bold").setFontSize(8).setBackground("#F0FDF9").setHorizontalAlignment("center");
    fila++;
    var totalUnid = topProd.reduce(function(s,p){return s+p[1];}, 0) || 1;
    topProd.forEach(function(item, idx) {
      var pct = Math.round(item[1]/totalUnid*100);
      var bg  = idx%2===0 ? "#F0FDF9" : "#FFFFFF";
      dash.getRange(fila,1).setValue(item[0]).setFontSize(9).setBackground(bg);
      dash.getRange(fila,2).setValue(item[1]).setFontSize(9).setBackground(bg).setFontWeight("bold").setHorizontalAlignment("center");
      dash.getRange(fila,3,1,2).merge().setValue(pct + "%  " + Array(Math.round(pct/5)+1).join("▪"))
        .setFontSize(9).setFontColor("#0D9488").setBackground(bg);
      fila++;
    });
    if (topProd.length === 0) { dash.getRange(fila,1,1,4).merge().setValue("Sin pedidos aún").setFontSize(9).setFontColor("#94A3B8"); fila++; }
    fila++;

    // ── Sección: Clientes frecuentes ─────────────────────
    secHeader(fila, "👥 TOP 5 CLIENTES MÁS FRECUENTES"); fila++;
    dash.getRange(fila,1).setValue("Cliente").setFontWeight("bold").setFontSize(8).setBackground("#F0FDF9");
    dash.getRange(fila,2).setValue("Pedidos").setFontWeight("bold").setFontSize(8).setBackground("#F0FDF9").setHorizontalAlignment("center");
    dash.getRange(fila,3,1,2).merge().setValue("Valor aprox. acumulado").setFontWeight("bold").setFontSize(8).setBackground("#F0FDF9");
    fila++;
    topClientes.forEach(function(item, idx) {
      var bg = idx%2===0 ? "#F0FDF9" : "#FFFFFF";
      // Buscar total acumulado en hoja Clientes
      var totalAcum = "";
      if (clientes && clientes.getLastRow() > 1) {
        var clData = clientes.getDataRange().getValues();
        var clHdr  = clData[0].map(function(h){ return String(h).toLowerCase().trim(); });
        var nomIdx = clHdr.indexOf("nombre"); var gastIdx = clHdr.indexOf("total_gastado");
        if (nomIdx >= 0 && gastIdx >= 0) {
          var nombreBusq = item[0].replace(/\s*\([^)]+\)/, "").trim();
          clData.slice(1).forEach(function(cr){
            if (String(cr[nomIdx]).trim().toLowerCase() === nombreBusq.toLowerCase()) {
              totalAcum = "$ " + Number(cr[gastIdx]).toLocaleString();
            }
          });
        }
      }
      dash.getRange(fila,1).setValue(item[0]).setFontSize(9).setBackground(bg);
      dash.getRange(fila,2).setValue(item[1]).setFontSize(9).setBackground(bg).setFontWeight("bold").setHorizontalAlignment("center");
      dash.getRange(fila,3,1,2).merge().setValue(totalAcum || "—").setFontSize(9).setFontColor("#0D9488").setBackground(bg);
      fila++;
    });
    if (topClientes.length === 0) { dash.getRange(fila,1,1,4).merge().setValue("Sin clientes aún").setFontSize(9).setFontColor("#94A3B8"); fila++; }
    fila++;

    // ── Sección: Zonas y métodos de pago (lado a lado) ───
    secHeader(fila, "📍 ZONAS DE ENVÍO MÁS FRECUENTES"); fila++;
    topZonas.forEach(function(item, idx) {
      var bg = idx%2===0 ? "#F0FDF9" : "#FFFFFF";
      dash.getRange(fila,1,1,2).merge().setValue(item[0]).setFontSize(9).setBackground(bg);
      dash.getRange(fila,3).setValue(item[1] + " pedidos").setFontSize(9).setBackground(bg).setFontColor("#0D9488");
      dash.getRange(fila,4).setValue("").setBackground(bg);
      fila++;
    });
    if (topZonas.length === 0) { dash.getRange(fila,1,1,4).merge().setValue("Sin datos").setFontSize(9).setFontColor("#94A3B8"); fila++; }
    fila++;

    secHeader(fila, "💳 MÉTODOS DE PAGO"); fila++;
    topPagos.forEach(function(item, idx) {
      var bg  = idx%2===0 ? "#F0FDF9" : "#FFFFFF";
      var pct = Math.round(item[1] / rows.length * 100);
      dash.getRange(fila,1,1,2).merge().setValue(item[0]).setFontSize(9).setBackground(bg);
      dash.getRange(fila,3).setValue(item[1] + " pedidos (" + pct + "%)").setFontSize(9).setBackground(bg).setFontColor("#0D9488");
      dash.getRange(fila,4).setValue("").setBackground(bg);
      fila++;
    });
    if (topPagos.length === 0) { dash.getRange(fila,1,1,4).merge().setValue("Sin datos").setFontSize(9).setFontColor("#94A3B8"); fila++; }
    fila++;

    // ── Sección: Estado de pedidos ────────────────────────
    secHeader(fila, "📦 ESTADO GENERAL DE PEDIDOS"); fila++;
    var estadosData = [
      ["Pendiente de pago", pendientes, "#FEE2E2", "#991B1B"],
      ["Pagados",           pagados,    "#DCFCE7", "#166534"],
      ["Entregados",        entregados, "#DBEAFE", "#1E40AF"],
    ];
    estadosData.forEach(function(item) {
      var pct = rows.length > 0 ? Math.round(item[1] / rows.length * 100) : 0;
      dash.getRange(fila,1,1,2).merge().setValue(item[0]).setFontSize(9).setBackground(item[2]).setFontColor(item[3]);
      dash.getRange(fila,3).setValue(item[1]).setFontSize(9).setBackground(item[2]).setFontColor(item[3]).setFontWeight("bold").setHorizontalAlignment("center");
      dash.getRange(fila,4).setValue(pct + "%").setFontSize(9).setBackground(item[2]).setFontColor(item[3]).setHorizontalAlignment("center");
      fila++;
    });
    fila++;

    // ── Sección: Calificaciones ───────────────────────────
    secHeader(fila, "⭐ CALIFICACIONES DE CLIENTES"); fila++;
    var starsStr = avgRating > 0 ? avgRating.toFixed(1) + " / 5" : "Sin reseñas";
    var estrellasVis = avgRating > 0 ? Array(Math.round(avgRating)+1).join("★") + Array(6-Math.round(avgRating)).join("☆") : "—";
    dash.getRange(fila,1,1,2).merge().setValue("Promedio").setFontSize(9).setBackground("#F0FDF9");
    dash.getRange(fila,3).setValue(starsStr).setFontSize(9).setFontWeight("bold").setBackground("#F0FDF9").setFontColor("#F59E0B");
    dash.getRange(fila,4).setValue(numResenas + " reseñas").setFontSize(9).setBackground("#F0FDF9").setFontColor("#94A3B8");
    fila++;
    dash.getRange(fila,1,1,4).merge().setValue(estrellasVis).setFontSize(16).setFontColor("#F59E0B")
      .setHorizontalAlignment("center").setBackground("#FFFBEB");
    fila += 2;

    // ── Sección: Alertas de inventario ────────────────────
    if (agotados.length > 0 || stockBajo.length > 0) {
      secHeader(fila, "🚨 ALERTAS DE INVENTARIO"); fila++;
      agotados.forEach(function(nm) {
        dash.getRange(fila,1,1,4).merge().setValue("🔴 AGOTADO: " + nm)
          .setFontSize(9).setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
        fila++;
      });
      stockBajo.forEach(function(nm) {
        dash.getRange(fila,1,1,4).merge().setValue("🟡 STOCK BAJO: " + nm)
          .setFontSize(9).setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        fila++;
      });
      fila++;
    }

    // Ajustar columnas y formato final
    dash.setColumnWidth(1, 220);
    dash.setColumnWidth(2, 130);
    dash.setColumnWidth(3, 130);
    dash.setColumnWidth(4, 130);
    dash.setFrozenRows(1);

    // Eliminar gráficas anteriores si existen
    dash.getCharts().forEach(function(c){ dash.removeChart(c); });

    // ── Gráfica de ventas semanales ──────────────────────
    var graficoData = [["Semana","Ventas"]];
    semOrder.forEach(function(sem){ graficoData.push([sem, ventasSemana[sem]||0]); });
    var grafRange = dash.getRange(fila, 1, graficoData.length, 2);
    grafRange.setValues(graficoData);
    grafRange.setBackground("#F8FAFC");
    // Agregar encabezado visual
    dash.getRange(fila,1).setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");
    dash.getRange(fila,2).setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");

    var chart = dash.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(grafRange)
      .setPosition(fila, 3, 0, 0)
      .setOption("title", "Ventas por Semana")
      .setOption("titleTextStyle", { color: "#0F766E", fontSize: 12, bold: true })
      .setOption("backgroundColor", "#F0FDF9")
      .setOption("colors", ["#0D9488"])
      .setOption("legend", { position: "none" })
      .setOption("hAxis", { format: "$ #,##0", textStyle: { color: "#334155", fontSize: 8 } })
      .setOption("vAxis", { textStyle: { color: "#334155", fontSize: 8 } })
      .setOption("chartArea", { width: "75%", height: "75%" })
      .setOption("width",  380)
      .setOption("height", 260)
      .build();
    dash.insertChart(chart);

    Logger.log("Dashboard OK: " + rows.length + " pedidos. Fila final: " + fila);

  } catch(err) {
    Logger.log("Error dashboard: " + err.message + "\n" + err.stack);
  }
}

/* ──────────────────────────────────────────────────────────────
   NOTIFICACIÓN EMAIL
────────────────────────────────────────────────────────────── */
function notificarPedido(body) {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return;
    var total   = body.total ? "$ " + Number(body.total).toLocaleString("es-CO") : "A convenir";
    var subject = "Nuevo pedido Limpieza RR - " + (body.nombre || "cliente");
    var html =
      "<h2 style='color:#0D9488;font-family:sans-serif'>Nuevo Pedido Recibido</h2>" +
      "<table style='border-collapse:collapse;width:100%;font-family:sans-serif'>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Cliente</td><td style='padding:8px'>"   + (body.nombre     || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Telefono</td><td style='padding:8px'>"  + (body.telefono   || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Direccion</td><td style='padding:8px'>" + (body.barrio || "") + " - " + (body.direccion || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Pago</td><td style='padding:8px'>"      + (body.pago       || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Zona</td><td style='padding:8px'>"      + (body.zona_envio || "") + "</td></tr>" +
      "<tr><td style='padding:8px;background:#F0FDF9;font-weight:bold'>Total</td><td style='padding:8px;color:#0D9488;font-weight:bold'>" + total + "</td></tr>" +
      "</table>" +
      "<h3 style='color:#0F766E;margin-top:20px;font-family:sans-serif'>Productos:</h3>" +
      "<pre style='background:#F0FDF9;padding:12px;border-radius:8px;font-family:sans-serif'>" + (body.productos || "") + "</pre>";
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html });
  } catch(err) {
    Logger.log("Error email: " + err.message);
  }
}

/* ──────────────────────────────────────────────────────────────
   CUPONES — validar
────────────────────────────────────────────────────────────── */
function validarCupon(code) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Cupones");
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var hdr  = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var COL  = {}; hdr.forEach(function(h,i){ COL[h]=i; });
  var found = null;
  data.slice(1).forEach(function(r){ if (String(r[COL["codigo"]]||"").toUpperCase()===code.toUpperCase()) found=r; });
  if (!found) return null;
  if (String(found[COL["activo"]]).toLowerCase()!=="true") return null;
  var uses=Number(found[COL["usos_actuales"]])||0, maxU=found[COL["usos_maximos"]]!==""?Number(found[COL["usos_maximos"]]):Infinity;
  if (uses>=maxU) return null;
  var vencimiento = parseLimpiezaDate(found[COL["vencimiento"]]);
  if (vencimiento && vencimiento < new Date()) return null;
  return { type: String(found[COL["tipo"]]||"pct"), value: Number(found[COL["valor"]]||0), label: String(found[COL["descripcion"]]||code) };
}

/* ──────────────────────────────────────────────────────────────
   CUPONES — incrementar uso
────────────────────────────────────────────────────────────── */
function incrementarUsoCupon(ss, code) {
  if (!code) return;
  var sheet = ss.getSheetByName("Cupones"); if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var hdr  = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  var COL  = {}; hdr.forEach(function(h,i){ COL[h]=i+1; });
  for (var i=1;i<data.length;i++){
    if (String(data[i][COL["codigo"]-1]).toUpperCase()===code.toUpperCase()){
      var cell=sheet.getRange(i+1,COL["usos_actuales"]); cell.setValue((Number(cell.getValue())||0)+1); break;
    }
  }
}

/* ──────────────────────────────────────────────────────────────
   CALIFICACIONES
────────────────────────────────────────────────────────────── */
function inicializarCalificaciones() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Calificaciones");
  if (!sheet) sheet = ss.insertSheet("Calificaciones");
  asegurarEncabezados(sheet, CALIFICACIONES_HEADERS);
  aplicarEstiloBasicoEncabezado(sheet, "#F59E0B", "#FFFFFF");
  ponerNotaPorEncabezado(sheet, "estrellas", "Valor de 1 a 5 para medir la satisfaccion del cliente.");
  if (typeof formatearComoTabla === "function") formatearComoTabla("Calificaciones");
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  Logger.log("OK: hoja Calificaciones lista.");
}

function guardarCalificacion(ss, body) {
  var sheet = ss.getSheetByName("Calificaciones");
  if (!sheet || sheet.getLastColumn() === 0) {
    inicializarCalificaciones();
    sheet = ss.getSheetByName("Calificaciones");
  }
  appendRowByHeaders(sheet, {
    fecha: new Date().toLocaleString("es-CO"),
    nombre: body.nombre || "",
    telefono: typeof normalizarTelefono === "function" ? normalizarTelefono(body.telefono || "") : String(body.telefono || ""),
    estrellas: body.estrellas || 0,
    comentario: body.comentario || ""
  });
}

/* ──────────────────────────────────────────────────────────────
   INICIALIZAR CUPONES — ejecutar una vez
────────────────────────────────────────────────────────────── */
function inicializarCupones() {
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName("Cupones");
  if (!sheet) sheet=ss.insertSheet("Cupones");
  asegurarEncabezados(sheet, CUPONES_HEADERS);
  if (sheet.getLastRow() <= 1){
    sheet.getRange(1,1,1,sheet.getLastColumn()).setFontWeight("bold").setBackground("#F59E0B").setFontColor("#fff");
    sheet.appendRow(["BIENVENIDO","10% descuento bienvenida","pct",10,"",0,"",true]);
    sheet.appendRow(["PROMO5K","Descuento fijo $5.000","fixed",5000,100,0,"",true]);
    sheet.appendRow(["VIP20","20% clientes VIP","pct",20,50,0,"",true]);
  }
  aplicarEstiloBasicoEncabezado(sheet, "#F59E0B", "#FFFFFF");
  aplicarFormatoMonedaPorEncabezado(sheet, ["valor"]);
  if (typeof formatearComoTabla === "function") formatearComoTabla("Cupones");
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  Logger.log("OK: hoja Cupones lista.");
}

/* ──────────────────────────────────────────────────────────────
   SETUP COMPLETO v2
────────────────────────────────────────────────────────────── */
function setupCompleto() {
  configuracionInicial();
  Logger.log("=== Setup v2 completo desde configuracionInicial() ===");
}
