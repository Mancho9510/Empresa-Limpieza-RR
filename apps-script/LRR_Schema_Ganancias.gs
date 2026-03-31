/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Setup y Utilidades v3
   Correcciones:
   ✅ BUG-11: ADMIN_KEY referenciada desde LIMPIEZARR.gs (ya centralizada)
   ✅ BUG-05: aplicarPreciosSugeridos guarda número, no string con %
   ✅ BUG-13: calcularPreciosConMargen — if(ui){} correctamente cerrado
═══════════════════════════════════════════════════════════ */

var PRODUCTOS_HEADERS    = ["id","nombre","tamano","precio","costo","categoria","destacado","emoji","descripcion","imagen","imagen2","imagen3","stock"];
var PEDIDOS_HEADERS      = ["fecha","nombre","telefono","ciudad","departamento","barrio","direccion","casa","conjunto","nota","cupon","descuento","pago","zona_envio","costo_envio","subtotal","total","estado_pago","estado_envio","productos","productos_json"];
var CLIENTES_HEADERS     = ["primera_compra","ultima_compra","nombre","telefono","ciudad","barrio","direccion","total_pedidos","total_gastado","tipo"];
var PROVEEDORES_HEADERS  = ["nombre","contacto_nombre","telefono","email","productos","direccion","nota","fecha_registro","activo"];
var CUPONES_HEADERS      = ["codigo","descripcion","tipo","valor","usos_maximos","usos_actuales","vencimiento","activo"];
var CALIFICACIONES_HEADERS = ["fecha","nombre","telefono","estrellas","comentario"];

// ── Margen: lee de PropertiesService, fallback a 80% ──
function getMargenDeseado() {
  try {
    var val = PropertiesService.getScriptProperties().getProperty("MARGEN_DESEADO");
    if (val) return Number(val) || 80;
  } catch(e) {}
  return 80;
}
var MARGEN_DESEADO = getMargenDeseado();

/* ──────────────────────────────────────────────────────────────
   HELPERS DE HOJA
────────────────────────────────────────────────────────────── */
function normalizarHeader(value) {
  return String(value || "").toLowerCase().trim();
}

function obtenerCabeceras(sheet) {
  var lastCol = sheet.getLastColumn();
  if (!lastCol) return { headers: [], map: {} };
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function(header, index) {
    map[normalizarHeader(header)] = index + 1;
  });
  return { headers: headers, map: map };
}

function asegurarEncabezados(sheet, headers) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return true;
  }
  var info    = obtenerCabeceras(sheet);
  var changed = false;
  headers.forEach(function(header) {
    if (info.map[normalizarHeader(header)]) return;
    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue(header);
    info    = obtenerCabeceras(sheet);
    changed = true;
  });
  return changed;
}

function appendRowByHeaders(sheet, data) {
  var info = obtenerCabeceras(sheet);
  if (!info.headers.length) throw new Error("La hoja " + sheet.getName() + " no tiene encabezados");
  var row = info.headers.map(function(header) {
    var key = normalizarHeader(header);
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateRowByHeaders(sheet, rowNum, data) {
  var info = obtenerCabeceras(sheet);
  Object.keys(data).forEach(function(key) {
    var col = info.map[normalizarHeader(key)];
    if (col) sheet.getRange(rowNum, col).setValue(data[key]);
  });
}

function aplicarEstiloBasicoEncabezado(sheet, bg, fg) {
  var lastCol = sheet.getLastColumn();
  if (!lastCol) return;
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight("bold").setBackground(bg).setFontColor(fg)
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function aplicarFormatoMonedaPorEncabezado(sheet, headers) {
  var info    = obtenerCabeceras(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  headers.forEach(function(header) {
    var col = info.map[normalizarHeader(header)];
    if (!col) return;
    sheet.getRange(2, col, lastRow - 1, 1).setNumberFormat("$ #,##0");
  });
}

function ponerNotaPorEncabezado(sheet, headerName, note) {
  var info = obtenerCabeceras(sheet);
  var col  = info.map[normalizarHeader(headerName)];
  if (col) sheet.getRange(1, col).setNote(note);
}

function obtenerUiSegura() {
  try { return SpreadsheetApp.getUi(); }
  catch (err) { return null; }
}

/* ──────────────────────────────────────────────────────────────
   CATEGORÍA SUAVIZANTES
────────────────────────────────────────────────────────────── */
function actualizarCategoriaSuavizantes() {
  var ss    = getSS();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var info       = obtenerCabeceras(sheet);
  var nombreCol  = info.map["nombre"];
  var categoriaCol = info.map["categoria"];
  if (!nombreCol || !categoriaCol) return 0;
  var lastRow   = sheet.getLastRow();
  var nombres   = sheet.getRange(2, nombreCol, lastRow - 1, 1).getValues();
  var categorias= sheet.getRange(2, categoriaCol, lastRow - 1, 1).getValues();
  var cambios   = 0;
  for (var i = 0; i < nombres.length; i++) {
    var nombre = String(nombres[i][0] || "").toLowerCase();
    if (!nombre.includes("suavizante")) continue;
    if (String(categorias[i][0] || "") === "Suavizante") continue;
    categorias[i][0] = "Suavizante";
    cambios++;
  }
  if (cambios > 0) {
    sheet.getRange(2, categoriaCol, categorias.length, 1).setValues(categorias);
  }
  Logger.log("Suavizantes normalizados: " + cambios);
  return cambios;
}

/* ──────────────────────────────────────────────────────────────
   POPULATE PRODUCTOS
────────────────────────────────────────────────────────────── */
function populateProductos(forzar) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) sheet = ss.insertSheet("Productos");

  if (!forzar && sheet.getLastRow() > 1) {
    asegurarEncabezados(sheet, PRODUCTOS_HEADERS);
    aplicarEstiloBasicoEncabezado(sheet, "#0F766E", "#FFFFFF");
    aplicarFormatoMonedaPorEncabezado(sheet, ["precio","costo"]);
    if (typeof formatearComoTabla === "function") formatearComoTabla("Productos");
    actualizarCategoriaSuavizantes();
    Logger.log("Productos: hoja existente conservada y esquema validado (" + (sheet.getLastRow()-1) + " filas).");
    return;
  }

  sheet.clear();
  sheet.appendRow(PRODUCTOS_HEADERS);
  var hdr = sheet.getRange(1, 1, 1, PRODUCTOS_HEADERS.length);
  hdr.setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");
  sheet.getRange(1, 11, 1, 1).setBackground("#FFF176").setFontColor("#5F4000");
  sheet.getRange(1,  5).setNote("COSTO: precio de compra. Requerido para calcular ganancia.");
  sheet.getRange(1,  6).setNote("GANANCIA %: ((precio-costo)/costo)*100. Número puro, no string con %.");
  sheet.getRange(1, 14).setNote("STOCK: vacío=sin control | 0=agotado | número=unidades");

  var rows = [
    [1,"Cera Autobrillante Envase","1 Kg",16000,"","","Ceras",false,"✨","Cera autobrillante de alta calidad. Brillo duradero.","","","",""],
    [2,"Cera Autobrillante Galon","4 Kg",46333.68,"","","Ceras",false,"✨","Galon para uso intensivo. Ideal para negocios.","","","",""],
    [3,"Detergente Textil Galon","4 Kg",26743.72,"","","Detergentes",false,"🧺","Formula concentrada. Elimina manchas difíciles.","","","",""],
    [4,"Desengrasante Multiusos Linea Hogar Envase","1 Kg",10700,"","","Detergentes",true,"🧽","Desengrasante multiusos para cocinas y baños.","","","",""],
    [5,"Desengrasante Multiusos Linea Hogar Galon","4 Kg",37300,"","","Detergentes",false,"🧽","Galon desengrasante. Rendimiento profesional.","","","",""],
    [6,"Detergente Textil","1 Kg",16000,"","","Detergentes",false,"🧺","Ideal para lavado a mano y máquina.","","","",""],
    [7,"Detergente Textil","2 Kg",15000,"","","Detergentes",true,"🧺","2 Kg para familias. Formula concentrada.","","","",""],
    [8,"Fragancia Irresistible Dude","100 ml",38034.99,"","","Fragancias",false,"🌸","Fragancia masculina intensa. Notas amaderadas.","","","",""],
    [9,"Fragancia Golden Gladiator","100 ml",36459.43,"","","Fragancias",false,"🌸","Notas doradas y especiadas.","","","",""],
    [10,"Fragancia Happiness","100 ml",49004.21,"","","Fragancias",false,"🌸","Alegre y fresca. Evoca momentos felices.","","","",""],
    [11,"Fragancia Bad Girl Gone Good","100 ml",52195.74,"","","Fragancias",false,"🌸","Audaz y sofisticada. Dulzura y misterio.","","","",""],
    [12,"Fragancia Luxury Amber","100 ml",36341.97,"","","Fragancias",false,"🌸","Notas ámbar cálidas y lujosas.","","","",""],
    [13,"Fragancia Sublime","100 ml",36341.97,"","","Fragancias",false,"🌸","Notas florales de elegancia incomparable.","","","",""],
    [14,"Fragancia Millonaire","100 ml",57093.81,"","","Fragancias",false,"🌸","La más lujosa. Opulenta y exclusiva.","","","",""],
    [15,"Fragancia Kingdom","100 ml",36459.43,"","","Fragancias",false,"🌸","Majestuosa con carácter propio.","","","",""],
    [16,"Fragancia Aquaman","100 ml",47108.35,"","","Fragancias",false,"🌸","Acuática y refrescante.","","","",""],
    [17,"Fragancia Fanning","100 ml",33665.10,"","","Fragancias",false,"🌸","Ligera y versátil. Uso diario.","","","",""],
    [18,"Fragancia Pomelo & Granada","100 ml",29750,"","","Fragancias",false,"🌸","Frutal vibrante. Pomelo y granada.","","","",""],
    [19,"Fragancia Perfume Marine","100 ml",29750,"","","Fragancias",false,"🌸","Marina limpia con notas acuáticas.","","","",""],
    [20,"Fragancia Pastel Dream","100 ml",29750,"","","Fragancias",false,"🌸","Dulce y soñadora. Notas pastel.","","","",""],
    [21,"Fragancia Shine Alight","100 ml",29750,"","","Fragancias",false,"🌸","Luminosa y positiva.","","","",""],
    [22,"Fragancia The Boss Perfume","100 ml",35700,"","","Fragancias",false,"🌸","Poderosa y dominante.","","","",""],
    [23,"Fragancia LG Silverhill","100 ml",29750,"","","Fragancias",false,"🌸","Plateada y sofisticada.","","","",""],
    [24,"Fragancia Platinum","100 ml",29750,"","","Fragancias",false,"🌸","Elegante y atemporal.","","","",""],
    [25,"Gel Antibacterial Para Manos Galon","3.5 Kg",35590.89,"","","Antibacteriales",false,"🤲","Gran rendimiento. 99.9% bacterias.","","","",""],
    [26,"Gel Antibacterial Para Manos","500 gr",7735,"","","Antibacteriales",false,"🤲","Personal. Suave con el cutis.","","","",""],
    [27,"Gel Antibacterial Para Manos","1000 gr",14280,"","","Antibacteriales",false,"🤲","Familiar. Protección diaria.","","","",""],
    [28,"Jabon Antibacterial Para Manos Galon","4 Kg",28560,"","","Antibacteriales",false,"🧼","Galon para dispensadores.","","","",""],
    [29,"Jabon Antibacterial Para Manos","500 gr",6584.27,"","","Antibacteriales",false,"🧼","Económico y eficaz.","","","",""],
    [30,"Jabon Antibacterial Para Manos","1000 gr",11971.40,"","","Antibacteriales",false,"🧼","Familiar. Limpia y cuida.","","","",""],
    [31,"Lavaloza Liquido Galon","4 Kg",31953.28,"","","Lavaloza",false,"🍽️","Concentrado. Elimina grasa fácil.","","","",""],
    [32,"Lavaloza Liquido Envase","500 gr",6000,"","","Lavaloza",false,"🍽️","Individual. Ollas brillantes.","","","",""],
    [33,"Lavaloza Liquido Envase","1000 gr",10000,"","","Lavaloza",false,"🍽️","1 Kg. Rendimiento familiar.","","","",""],
    [34,"Limpiapisos Encanto Tropical Envase","1 Kg",9000,"","","Limpiapisos",true,"🌿","Limpia y desinfecta. Olor fresco.","","","",""],
    [35,"Limpiapisos Encanto Tropical Galon","4 Kg",24370.43,"","","Limpiapisos",false,"🌿","Galon. Rendimiento profesional.","","","",""],
    [36,"Limpiapisos Encanto Tropical Envase","500 gr",6500,"","","Limpiapisos",true,"🌿","Pequeño. Práctico y económico.","","","",""],
    [37,"Limpiapisos Encanto Tropical Envase","1000 gr",11000,"","","Limpiapisos",true,"🌿","Familiar. Aroma duradero.","","","",""],
    [38,"Limpia Vidrios Envase","500 gr",5500,"","","Limpia Vidrios",false,"🪟","Sin rayas. Cristales perfectos.","","","",""],
    [39,"Limpia Vidrios Envase","1 Kg",8000,"","","Limpia Vidrios",true,"🪟","Antivaho. Claridad total.","","","",""],
    [40,"Limpia Vidrios Galon","4 Kg",27370,"","","Limpia Vidrios",false,"🪟","Galon. Ideal para edificios.","","","",""],
    [41,"Oxigeno Activo","1 Kg",12500,"","","Otros",true,"💧","Sin cloro. Cuida colores.","","","",""],
    [42,"Suavizante Galon","4 Kg",21420,"","","Suavizante",false,"🌺","Suave y fragante. Larga duración.","","","",""],
    [43,"Suavizante Galon","1000 gr",10000,"","","Suavizante",false,"🌺","1 Kg. Cuida fibras.","","","",""],
    [44,"Suavizante Galon","2000 gr",17000,"","","Suavizante",true,"🌺","2 Kg familiar. Económico.","","","",""],
  ];

  sheet.getRange(2, 1, rows.length, PRODUCTOS_HEADERS.length).setValues(rows);
  sheet.autoResizeColumns(1, PRODUCTOS_HEADERS.length);
  sheet.setFrozenRows(1);
  aplicarFormatoMonedaPorEncabezado(sheet, ["precio","costo"]);
  if (typeof formatearComoTabla === "function") formatearComoTabla("Productos");
  Logger.log("OK: " + rows.length + " productos.");
}

/* ──────────────────────────────────────────────────────────────
   LIMPIAR STOCK
────────────────────────────────────────────────────────────── */
function limpiarStock() {
  var ss    = getSS();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var stockCol = headers.indexOf("stock") + 1;
  if (!stockCol) { Logger.log("Columna stock no encontrada"); return; }
  var lastRow  = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, stockCol, lastRow - 1, 1).clearContent();
  Logger.log("Stock limpiado en " + (lastRow - 1) + " productos.");
}

function resetearProductos() {
  Logger.log("Iniciando reset de productos...");
  populateProductos(true);
  Logger.log("Hoja Productos recreada con los 44 productos originales.");
}

/* ──────────────────────────────────────────────────────────────
   CALCULAR GANANCIAS — batch sobre toda la hoja
────────────────────────────────────────────────────────────── */
function calcularGanancias() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var _s    = leerSheet(ss, "Productos");
  if (!_s.sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var precioIdx   = _s.headers.indexOf("precio")       + 1;
  var costoIdx    = _s.headers.indexOf("costo")        + 1;
  var gananciaIdx = _s.headers.indexOf("ganancia_pct") + 1;
  if (!costoIdx || !gananciaIdx) {
    Logger.log("ERROR: Columnas costo o ganancia_pct no encontradas.");
    return;
  }
  var actualizados = 0;
  for (var i = 0; i < _s.rows.length; i++) {
    var precio = Number(_s.rows[i][precioIdx - 1]);
    var costo  = Number(_s.rows[i][costoIdx  - 1]);
    if (!precio || !costo || costo <= 0) continue;
    var _g = calcGanancia(precio, costo);  // centralizado en Utils
    var cell = _s.sheet.getRange(i + 2, gananciaIdx);
    cell.setValue(_g.pct).setNumberFormat('0.00"%"');
    if (_g.pct < 10)      cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
    else if (_g.pct < 30) cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
    else                  cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("normal");
    actualizados++;
  }
  Logger.log("Ganancias calculadas: " + actualizados + " productos.");
}

/* ──────────────────────────────────────────────────────────────
   AGREGAR COLUMNAS COSTO Y GANANCIA_PCT (migración)
────────────────────────────────────────────────────────────── */
function agregarColumnasCostoGanancia() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var headers   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
                    .map(function(h) { return String(h).toLowerCase().trim(); });
  var precioCol = headers.indexOf("precio") + 1;
  if (precioCol === 0) { Logger.log("Columna precio no encontrada"); return; }
  if (headers.indexOf("costo") < 0) {
    sheet.insertColumnAfter(precioCol);
    sheet.getRange(1, precioCol + 1).setValue("costo")
      .setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");
    Logger.log("Columna 'costo' insertada.");
  }
  headers   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
                .map(function(h) { return String(h).toLowerCase().trim(); });
  var costoCol = headers.indexOf("costo") + 1;
  if (headers.indexOf("ganancia_pct") < 0) {
    sheet.insertColumnAfter(costoCol);
    sheet.getRange(1, costoCol + 1).setValue("ganancia_pct")
      .setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");
    Logger.log("Columna 'ganancia_pct' insertada.");
  }
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  Logger.log("Listo. Ejecuta calcularGanancias() para poblar los valores.");
}

/* ──────────────────────────────────────────────────────────────
   CALCULAR PRECIOS CON MARGEN — escribe en columna precio_sugerido
────────────────────────────────────────────────────────────── */
function calcularPreciosConMargen() {
  var margen = MARGEN_DESEADO;
  var ui     = obtenerUiSegura();
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var _s     = leerSheet(ss, "Productos");
  if (!_s.sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var costoIdx  = _s.headers.indexOf("costo")  + 1;
  var precioIdx = _s.headers.indexOf("precio") + 1;
  if (!costoIdx) { Logger.log("Columna costo no encontrada"); return; }
  var sugIdx = _s.headers.indexOf("precio_sugerido") + 1;
  if (!sugIdx) {
    _s.sheet.insertColumnAfter(_s.sheet.getLastColumn());
    sugIdx = _s.sheet.getLastColumn();
    _s.sheet.getRange(1, sugIdx).setValue("precio_sugerido")
      .setFontWeight("bold").setBackground("#FEF9C3").setFontColor("#854D0E")
      .setNote("Precio sugerido con margen " + margen + "%. NO modifica el precio real.");
  }
  var actualizados = 0;
  for (var i = 0; i < _s.rows.length; i++) {
    var costo  = Number(_s.rows[i][costoIdx - 1]);
    var precio = Number(_s.rows[i][precioIdx - 1]);
    if (!costo || costo <= 0) continue;
    var sugerido = Math.ceil(costo * (1 + margen / 100));
    var cell     = _s.sheet.getRange(i + 2, sugIdx);
    cell.setValue(sugerido).setNumberFormat("$ #,##0");
    if (precio > 0) {
      var diff = sugerido - precio;
      if (Math.abs(diff) < 100)    cell.setBackground("#DCFCE7").setFontColor("#166534");
      else if (diff > 0)           cell.setBackground("#FEF9C3").setFontColor("#854D0E");
      else                         cell.setBackground("#FEE2E2").setFontColor("#991B1B");
    } else {
      cell.setBackground("#F0FDF9");
    }
    actualizados++;
  }
  _s.sheet.autoResizeColumns(sugIdx, 1);
  Logger.log("Precios sugeridos con margen " + margen + "%: " + actualizados + " productos.");
  // BUG-13 FIX: if(ui){} correctamente cerrado dentro de la función
  if (ui) {
    ui.alert(
      "✅ Precios sugeridos calculados\n\n" +
      actualizados + " productos con margen " + margen + "%.\n\n" +
      "Revisa la columna 'precio_sugerido'.\n" +
      "Para aplicarlos al precio real: ejecuta aplicarPreciosSugeridos()"
    );
  }
}

/* ──────────────────────────────────────────────────────────────
   APLICAR PRECIOS SUGERIDOS AL PRECIO REAL
   BUG-05 FIX: ganancia se guarda como número + setNumberFormat, no como string
────────────────────────────────────────────────────────────── */
function aplicarPreciosSugeridos() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var _s    = leerSheet(ss, "Productos");
  if (!_s.sheet) { Logger.log("Hoja Productos no encontrada"); return; }
  var precioIdx  = _s.headers.indexOf("precio")          + 1;
  var sugIdx     = _s.headers.indexOf("precio_sugerido") + 1;
  var ganIdx     = _s.headers.indexOf("ganancia_pct")    + 1;
  var costoIdx   = _s.headers.indexOf("costo")           + 1;
  if (!sugIdx) {
    Logger.log("No hay columna precio_sugerido. Ejecuta calcularPreciosConMargen() primero.");
    return;
  }
  var aplicados = 0;
  for (var i = 0; i < _s.rows.length; i++) {
    var sugerido = Number(_s.rows[i][sugIdx - 1]);
    if (!sugerido || sugerido <= 0) continue;
    _s.sheet.getRange(i + 2, precioIdx).setValue(sugerido)
      .setNumberFormat("$ #,##0").setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
    // BUG-05 FIX: setValue(ganancia) + setNumberFormat, NO setValue(ganancia + "%")
    if (ganIdx && costoIdx) {
      var costo = Number(_s.rows[i][costoIdx - 1]);
      if (costo > 0) {
        var _gs = calcGanancia(sugerido, costo);  // centralizado en Utils
        var ganCell  = _s.sheet.getRange(i + 2, ganIdx);
        ganCell.clearFormat().setValue(_gs.pct).setNumberFormat('0.00"%"');
        ganCell.setBackground(_gs.pct >= 30 ? "#DCFCE7" : _gs.pct >= 10 ? "#FEF9C3" : "#FEE2E2")
               .setFontColor(_gs.pct >= 30 ? "#166534" : _gs.pct >= 10 ? "#854D0E" : "#991B1B")
               .setFontWeight("bold");
      }
    }
    aplicados++;
  }
  Logger.log("✅ Precios aplicados: " + aplicados + " productos.");
}