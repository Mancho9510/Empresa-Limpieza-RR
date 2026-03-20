/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Setup y Utilidades (LIMPIEZARR_Setup.gs)
   Crea este como un segundo archivo en el mismo proyecto Apps Script.
   Todas las funciones son accesibles desde LIMPIEZARR.gs.
═══════════════════════════════════════════════════════════ */

var PRODUCTOS_HEADERS = ["id","nombre","tamano","precio","costo","ganancia_pct","categoria","destacado","emoji","descripcion","imagen","imagen2","imagen3","stock"];
var PEDIDOS_HEADERS = ["fecha","nombre","telefono","ciudad","departamento","barrio","direccion","casa","conjunto","nota","cupon","descuento","pago","zona_envio","costo_envio","subtotal","total","estado_pago","estado_envio","productos"];
var CLIENTES_HEADERS = ["primera_compra","ultima_compra","nombre","telefono","ciudad","barrio","direccion","total_pedidos","total_gastado","tipo"];
var PROVEEDORES_HEADERS = ["nombre","contacto_nombre","telefono","email","productos","direccion","nota","fecha_registro","activo"];
var CUPONES_HEADERS = ["codigo","descripcion","tipo","valor","usos_maximos","usos_actuales","vencimiento","activo"];
var CALIFICACIONES_HEADERS = ["fecha","nombre","telefono","estrellas","comentario"];

function normalizarHeader(value) {
  return String(value || "").toLowerCase().trim();
}

function obtenerCabeceras(sheet) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) return { headers: [], map: {} };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
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

  let info = obtenerCabeceras(sheet);
  let changed = false;
  headers.forEach(function(header) {
    if (info.map[normalizarHeader(header)]) return;
    sheet.insertColumnAfter(sheet.getLastColumn());
    sheet.getRange(1, sheet.getLastColumn()).setValue(header);
    info = obtenerCabeceras(sheet);
    changed = true;
  });
  return changed;
}

function appendRowByHeaders(sheet, data) {
  const info = obtenerCabeceras(sheet);
  if (!info.headers.length) throw new Error("La hoja " + sheet.getName() + " no tiene encabezados");

  const row = info.headers.map(function(header) {
    const key = normalizarHeader(header);
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : "";
  });

  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateRowByHeaders(sheet, rowNum, data) {
  const info = obtenerCabeceras(sheet);
  Object.keys(data).forEach(function(key) {
    const col = info.map[normalizarHeader(key)];
    if (col) sheet.getRange(rowNum, col).setValue(data[key]);
  });
}

function aplicarEstiloBasicoEncabezado(sheet, bg, fg) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) return;
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight("bold")
    .setBackground(bg)
    .setFontColor(fg)
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function aplicarFormatoMonedaPorEncabezado(sheet, headers) {
  const info = obtenerCabeceras(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  headers.forEach(function(header) {
    const col = info.map[normalizarHeader(header)];
    if (!col) return;
    sheet.getRange(2, col, lastRow - 1, 1).setNumberFormat("$ #,##0.00");
  });
}

function ponerNotaPorEncabezado(sheet, headerName, note) {
  const info = obtenerCabeceras(sheet);
  const col = info.map[normalizarHeader(headerName)];
  if (col) sheet.getRange(1, col).setNote(note);
}

function obtenerUiSegura() {
  try {
    return SpreadsheetApp.getUi();
  } catch (err) {
    return null;
  }
}

function actualizarCategoriaSuavizantes() {
  const ss = getSS();
  const sheet = ss.getSheetByName("Productos");
  if (!sheet || sheet.getLastRow() < 2) return 0;

  const info = obtenerCabeceras(sheet);
  const nombreCol = info.map["nombre"];
  const categoriaCol = info.map["categoria"];
  if (!nombreCol || !categoriaCol) return 0;

  const lastRow = sheet.getLastRow();
  const nombres = sheet.getRange(2, nombreCol, lastRow - 1, 1).getValues();
  const categorias = sheet.getRange(2, categoriaCol, lastRow - 1, 1).getValues();
  let cambios = 0;

  for (let i = 0; i < nombres.length; i++) {
    const nombre = String(nombres[i][0] || "").toLowerCase();
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

function populateProductos(forzar) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) sheet = ss.insertSheet("Productos");

  // PROTECCION: si ya hay datos y no se fuerza, no borrar nada
  if (!forzar && sheet.getLastRow() > 1) {
    asegurarEncabezados(sheet, PRODUCTOS_HEADERS);
    aplicarEstiloBasicoEncabezado(sheet, "#0F766E", "#FFFFFF");
    aplicarFormatoMonedaPorEncabezado(sheet, ["precio", "costo", "precio_sugerido"]);
    if (typeof formatearComoTabla === "function") formatearComoTabla("Productos");
    actualizarCategoriaSuavizantes();
    Logger.log(
      "ADVERTENCIA: La hoja Productos ya tiene " + (sheet.getLastRow() - 1) + " filas. " +
      "Se conservaron los datos y se valido el esquema."
    );
    return;
  }

  sheet.clear();

  const headers = PRODUCTOS_HEADERS;
  sheet.appendRow(headers);

  const hdr = sheet.getRange(1, 1, 1, headers.length);
  hdr.setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");

  // Columna imagen en amarillo para que sea fácil de identificar
  sheet.getRange(1, 11, 1, 1).setBackground("#FFF176").setFontColor("#5F4000");
  // Notas en columnas imagen y stock
  sheet.getRange(1, 5).setNote("COSTO: Precio al que compraste el producto. Se usa para calcular ganancia.");
  sheet.getRange(1, 6).setNote("GANANCIA %: Se calcula con calcularGanancias(). Formula: ((precio-costo)/costo)*100");
  sheet.getRange(1, 12).setNote("imagen2: segunda foto del producto (URL Drive o externa)");
  sheet.getRange(1, 13).setNote("imagen3: tercera foto del producto (URL Drive o externa)");
  sheet.getRange(1, 14).setNote(
    "STOCK:\n" +
    "- Vacío = sin control de inventario\n" +
    "- 0 = agotado (no se puede comprar)\n" +
    "- Número = unidades disponibles"
  );
  sheet.getRange(1, 11).setNote(
    "COMO AGREGAR IMAGEN:\n\n" +
    "1. Sube la foto a Google Drive\n" +
    "2. Click derecho sobre el archivo\n" +
    "3. 'Obtener enlace' -> Cambia a 'Cualquier persona'\n" +
    "4. Copia el enlace y pegalo aqui\n\n" +
    "El sistema lo convierte automaticamente.\n" +
    "Si esta vacio se muestra el emoji."
  );

  const rows = [
    [1,"Cera Autobrillante Envase","1 Kg",16000,"","","Ceras",false,"✨","Cera autobrillante de alta calidad para pisos. Brinda proteccion y brillo duradero.","","","",""],
    [2,"Cera Autobrillante Galon","4 Kg",46333.68,"","","Ceras",false,"✨","Presentacion galon para uso intensivo. Ideal para negocios o grandes superficies.","","","",""],
    [3,"Detergente Textil Galon","4 Kg",26743.72,"","","Detergentes",false,"🧺","Potente formula para ropa de todo tipo. Elimina manchas dificiles.","","","",""],
    [4,"Desengrasante Multiusos Linea Hogar Envase","1 Kg",10700,"","","Detergentes",true,"🧽","Desengrasante multiusos para cocinas, banos y superficies.","","","",""],
    [5,"Desengrasante Multiusos Linea Hogar Galon","4 Kg",37300,"","","Detergentes",false,"🧽","Presentacion galon del desengrasante multiusos. Rendimiento profesional.","","","",""],
    [6,"Detergente Textil","1 Kg",16000,"","","Detergentes",false,"🧺","Detergente textil ideal para lavado a mano y maquina.","","","",""],
    [7,"Detergente Textil","2 Kg",15000,"","","Detergentes",true,"🧺","Presentacion de 2 Kg perfecta para familias. Formula concentrada.","","","",""],
    [8,"Fragancia Irresistible Dude","100 ml",38034.99,"","","Fragancias",false,"🌸","Fragancia masculina intensa y seductora. Notas amaderadas con toques frescos.","","","",""],
    [9,"Fragancia Golden Gladiator","100 ml",36459.43,"","","Fragancias",false,"🌸","Fragancia poderosa con notas doradas y especiadas.","","","",""],
    [10,"Fragancia Happiness","100 ml",49004.21,"","","Fragancias",false,"🌸","Fragancia alegre y fresca que evoca momentos de felicidad.","","","",""],
    [11,"Fragancia Bad Girl Gone Good","100 ml",52195.74,"","","Fragancias",false,"🌸","Fragancia audaz y sofisticada. Combinacion de dulzura y misterio.","","","",""],
    [12,"Fragancia Luxury Amber","100 ml",36341.97,"","","Fragancias",false,"🌸","Esencia ambar con notas calidas y lujosas.","","","",""],
    [13,"Fragancia Sublime","100 ml",36341.97,"","","Fragancias",false,"🌸","Fragancia delicada con notas florales de elegancia incomparable.","","","",""],
    [14,"Fragancia Millonaire","100 ml",57093.81,"","","Fragancias",false,"🌸","La fragancia mas lujosa de la coleccion. Opulenta y exclusiva.","","","",""],
    [15,"Fragancia Kingdom","100 ml",36459.43,"","","Fragancias",false,"🌸","Majestuosa fragancia con caracter y personalidad propia.","","","",""],
    [16,"Fragancia Aquaman","100 ml",47108.35,"","","Fragancias",false,"🌸","Fragancia acuatica y refrescante. Evoca la frescura del oceano.","","","",""],
    [17,"Fragancia Fanning","100 ml",33665.10,"","","Fragancias",false,"🌸","Esencia ligera y versatil. Perfecta para uso diario.","","","",""],
    [18,"Fragancia Pomelo & Granada","100 ml",29750,"","","Fragancias",false,"🌸","Combinacion frutal vibrante de pomelo y granada.","","","",""],
    [19,"Fragancia Perfume Marine","100 ml",29750,"","","Fragancias",false,"🌸","Fragancia marina limpia y fresca con notas acuaticas.","","","",""],
    [20,"Fragancia Pastel Dream","100 ml",29750,"","","Fragancias",false,"🌸","Dulce y sonadora. Notas pastel suaves y romanticas.","","","",""],
    [21,"Fragancia Shine Alight","100 ml",29750,"","","Fragancias",false,"🌸","Fragancia luminosa y positiva como un rayo de sol.","","","",""],
    [22,"Fragancia The Boss Perfume","100 ml",35700,"","","Fragancias",false,"🌸","Para el verdadero lider. Fragancia poderosa y dominante.","","","",""],
    [23,"Fragancia LG Silverhill","100 ml",29750,"","","Fragancias",false,"🌸","Fragancia plateada y sofisticada. Fresca y con personalidad.","","","",""],
    [24,"Fragancia Platinum","100 ml",29750,"","","Fragancias",false,"🌸","La pureza del platino en fragancia. Elegante y atemporal.","","","",""],
    [25,"Gel Antibacterial Para Manos Galon","3.5 Kg",35590.89,"","","Antibacteriales",false,"🤲","Gel antibacterial de gran rendimiento. Elimina 99.9% de germenes.","","","",""],
    [26,"Gel Antibacterial Para Manos","500 gr",7735,"","","Antibacteriales",false,"🤲","Gel antibacterial personal. Formula suave con el cutis.","","","",""],
    [27,"Gel Antibacterial Para Manos","1000 gr",14280,"","","Antibacteriales",false,"🤲","Presentacion familiar de gel antibacterial protector.","","","",""],
    [28,"Jabon Antibacterial Para Manos Galon","4 Kg",28560,"","","Antibacteriales",false,"🧼","Jabon liquido antibacterial en galon para dispensadores.","","","",""],
    [29,"Jabon Antibacterial Para Manos","500 gr",6584.27,"","","Antibacteriales",false,"🧼","Jabon antibacterial economico y eficaz para manos.","","","",""],
    [30,"Jabon Antibacterial Para Manos","1000 gr",11971.40,"","","Antibacteriales",false,"🧼","Jabon liquido antibacterial familiar. Limpia y cuida.","","","",""],
    [31,"Lavaloza Liquido Galon","4 Kg",31953.28,"","","Lavaloza",false,"🍽️","Lavaloza concentrado. Elimina la grasa de utensilios con facilidad.","","","",""],
    [32,"Lavaloza Liquido Envase","500 gr",6000,"","","Lavaloza",false,"🍽️","Presentacion individual de lavaloza. Deja ollas brillantes.","","","",""],
    [33,"Lavaloza Liquido Envase","1000 gr",10000,"","","Lavaloza",false,"🍽️","Presentacion de 1 Kg de lavaloza. Excelente rendimiento familiar.","","","",""],
    [34,"Limpiapisos Encanto Tropical Envase","1 Kg",9000,"","","Limpiapisos",true,"🌿","Limpiapisos tropical. Limpia y desinfecta dejando olor fresco.","","","",""],
    [35,"Limpiapisos Encanto Tropical Galon","4 Kg",24370.43,"","","Limpiapisos",false,"🌿","Galon limpiapisos tropical. Rendimiento profesional.","","","",""],
    [36,"Limpiapisos Encanto Tropical Envase","500 gr",6500,"","","Limpiapisos",true,"🌿","Presentacion pequena del limpiapisos. Practica y economica.","","","",""],
    [37,"Limpiapisos Encanto Tropical Envase","1000 gr",11000,"","","Limpiapisos",true,"🌿","Tamano familiar limpiapisos tropical. Aroma duradero.","","","",""],
    [38,"Limpia Vidrios Envase","500 gr",5500,"","","Limpia Vidrios",false,"🪟","Limpiador de vidrios sin rayas. Deja superficies cristalinas.","","","",""],
    [39,"Limpia Vidrios Envase","1 Kg",8000,"","","Limpia Vidrios",true,"🪟","1 Kg limpia vidrios. Formula antivaho de claridad total.","","","",""],
    [40,"Limpia Vidrios Galon","4 Kg",27370,"","","Limpia Vidrios",false,"🪟","Galon limpia vidrios. Ideal para edificios y comercios.","","","",""],
    [41,"Oxigeno Activo","1 Kg",12500,"","","Otros",true,"💧","Blanqueador de oxigeno activo. Sin cloro, cuida colores.","","","",""],
    [42,"Suavizante Galon","4 Kg",21420,"","","Otros",false,"🌺","Suavizante textil de larga duracion. Ropa suave y fragante.","","","",""],
    [43,"Suavizante Galon","1000 gr",10000,"","","Otros",false,"🌺","Suavizante 1 Kg. Cuida fibras y perfuma la ropa.","","","",""],
    [44,"Suavizante Galon","2000 gr",17000,"","","Otros",true,"🌺","Suavizante 2 Kg familiar. Fragancia duradera y economico.","","","",""],
  ];

  rows.forEach(function(row) {
    if (String(row[1] || "").toLowerCase().indexOf("suavizante") >= 0) {
      row[6] = "Suavizante";
    }
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);
  aplicarFormatoMonedaPorEncabezado(sheet, ["precio", "costo", "precio_sugerido"]);
  if (typeof formatearComoTabla === "function") formatearComoTabla("Productos");
  actualizarCategoriaSuavizantes();

  Logger.log("OK: " + rows.length + " productos sincronizados.");
}

/* ──────────────────────────────────────────────────────────────
   INICIALIZAR PEDIDOS
────────────────────────────────────────────────────────────── */
// ── Resto del setup en LIMPIEZARR_Admin.gs ──
/* ══════════════════════════════════════════════════════════════
   ACTUALIZAR STOCK — ejecutar para poner cantidades iniciales
   Deja todas las celdas de stock en blanco (sin control)
   para que ningún producto aparezca como agotado.
   
   Después edita manualmente cada celda de stock en la hoja
   Productos si quieres controlar inventario de ese producto.
══════════════════════════════════════════════════════════════ */
function limpiarStock() {
  const ss    = getSS();
  const sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const stockCol = headers.indexOf("stock") + 1;
  if (!stockCol) { Logger.log("Columna stock no encontrada"); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Limpiar todas las celdas de stock (vacío = sin control de inventario)
  sheet.getRange(2, stockCol, lastRow - 1, 1).clearContent();

  Logger.log("Stock limpiado en " + (lastRow - 1) + " productos. Ninguno aparecerá como agotado.");
  Logger.log(
    "✅ Stock limpiado\n\n" +
    "Ahora ningún producto aparece como agotado.\n\n" +
    "Para controlar el inventario de un producto específico:\n" +
    "- Escribe el número de unidades disponibles en su celda de la columna 'stock'\n" +
    "- Escribe 0 si está agotado\n" +
    "- Deja vacío para no controlar ese producto"
  );
}

/* ══════════════════════════════════════════════════════════════
   RESETEAR PRODUCTOS — usar cuando borraste la hoja accidentalmente
   Recrea la hoja con los 44 productos originales.
   ADVERTENCIA: borra el contenido actual de la hoja Productos.
══════════════════════════════════════════════════════════════ */
function resetearProductos() {
  Logger.log("Iniciando reset de productos...");
  populateProductos(true);
  Logger.log("Hoja Productos recreada con los 44 productos originales.");
}

/* ══════════════════════════════════════════════════════════════
   CALCULAR GANANCIA
   Ejecutar para actualizar columna ganancia_pct en todos los
   productos que tengan precio y costo definidos.
══════════════════════════════════════════════════════════════ */
function calcularGanancias() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var precioIdx   = headers.indexOf("precio")       + 1;
  var costoIdx    = headers.indexOf("costo")        + 1;
  var gananciaIdx = headers.indexOf("ganancia_pct") + 1;

  if (!costoIdx || !gananciaIdx) {
    Logger.log("ERROR: Columnas costo o ganancia_pct no encontradas en la hoja Productos.");
    return;
  }

  var actualizados = 0;
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var precio = Number(data[i][precioIdx - 1]);
    var costo  = Number(data[i][costoIdx  - 1]);
    if (!precio || !costo || costo <= 0) continue;

    var ganancia = Math.round(((precio - costo) / costo) * 100 * 10) / 10;
    var cell = sheet.getRange(i + 1, gananciaIdx);
    cell.setValue(ganancia);

    if (ganancia < 10)      { cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold"); }
    else if (ganancia < 30) { cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold"); }
    else                    { cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("normal"); }
    actualizados++;
  }
  Logger.log("OK: " + actualizados + " productos con ganancia actualizada.");
}

/* ══════════════════════════════════════════════════════════════
   AGREGAR COLUMNAS COSTO Y GANANCIA_PCT
   Ejecutar UNA VEZ si la hoja Productos ya existia antes
   de agregar estas columnas (no borra datos).
══════════════════════════════════════════════════════════════ */
function agregarColumnasCostoGanancia() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h).toLowerCase().trim(); });

  var precioCol = headers.indexOf("precio") + 1;
  if (precioCol === 0) { Logger.log("Columna precio no encontrada"); return; }

  // Insertar columnas después de precio si no existen
  if (headers.indexOf("costo") < 0) {
    sheet.insertColumnAfter(precioCol);
    sheet.getRange(1, precioCol + 1).setValue("costo");
    sheet.getRange(1, precioCol + 1)
      .setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");
    Logger.log("Columna 'costo' insertada.");
  }

  // Recargar headers
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h).toLowerCase().trim(); });
  var costoCol = headers.indexOf("costo") + 1;

  if (headers.indexOf("ganancia_pct") < 0) {
    sheet.insertColumnAfter(costoCol);
    sheet.getRange(1, costoCol + 1).setValue("ganancia_pct");
    sheet.getRange(1, costoCol + 1)
      .setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");
    Logger.log("Columna 'ganancia_pct' insertada.");
  }

  sheet.autoResizeColumns(1, sheet.getLastColumn());
  Logger.log("Listo. Ahora ejecuta calcularGanancias() para poblar los valores.");
}

/* ══════════════════════════════════════════════════════════════
   CALCULAR PRECIOS CON MARGEN — para usar desde Sheets
   
   Cómo usar:
   1. Ejecuta esta función desde el editor de Apps Script
   2. Te pedirá el % de margen deseado
   3. Calcula el precio sugerido para cada producto con costo
   4. Lo escribe en la columna "precio_sugerido" (la crea si no existe)
   5. NO modifica la columna "precio" — solo sugiere
   
   Para APLICAR los precios sugeridos: usa aplicarPreciosSugeridos()
══════════════════════════════════════════════════════════════ */
// ─── AJUSTA EL MARGEN AQUÍ antes de ejecutar ───────────
var MARGEN_DESEADO = 80; // porcentaje (ej: 80 = 80%)
// ────────────────────────────────────────────────────────

function calcularPreciosConMargen() {
  var margen = MARGEN_DESEADO;
  var ui     = obtenerUiSegura();

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });

  var costoIdx  = headers.indexOf("costo")  + 1;
  var precioIdx = headers.indexOf("precio") + 1;
  if (!costoIdx) { Logger.log("Columna costo no encontrada"); return; }

  // Buscar o crear columna precio_sugerido
  var sugIdx = headers.indexOf("precio_sugerido") + 1;
  if (!sugIdx) {
    sheet.insertColumnAfter(sheet.getLastColumn());
    sugIdx = sheet.getLastColumn();
    var hdrCell = sheet.getRange(1, sugIdx);
    hdrCell.setValue("precio_sugerido");
    hdrCell.setFontWeight("bold").setBackground("#FEF9C3").setFontColor("#854D0E");
    hdrCell.setNote("Precio sugerido calculado con margen de " + margen + "% Formula: Costo × (1 + margen/100) NO modifica el precio real");
  }

  var actualizados = 0;
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var costo  = Number(data[i][costoIdx - 1]);
    var precio = Number(data[i][precioIdx - 1]);
    if (!costo || costo <= 0) continue;

    var sugerido = Math.ceil(costo * (1 + margen / 100));
    var cell     = sheet.getRange(i + 1, sugIdx);
    cell.setValue(sugerido);
    cell.setNumberFormat("$ #,##0");

    // Color según diferencia con precio actual
    if (precio > 0) {
      var diff = sugerido - precio;
      if (Math.abs(diff) < 100)      cell.setBackground("#DCFCE7").setFontColor("#166534"); // ok
      else if (diff > 0)             cell.setBackground("#FEF9C3").setFontColor("#854D0E"); // sube
      else                           cell.setBackground("#FEE2E2").setFontColor("#991B1B"); // baja
    } else {
      cell.setBackground("#F0FDF9");
    }
    actualizados++;
  }

  sheet.autoResizeColumns(sugIdx, 1);
  Logger.log("Precios sugeridos calculados con margen " + margen + "% para " + actualizados + " productos.");
  if (ui) {
    ui.alert("✅ Listo Precios sugeridos calculados con " + margen + "% de margen para " + actualizados + " productos. Revisa la columna 'precio_sugerido' en la hoja Productos. Si quieres aplicar esos precios al precio real, ejecuta aplicarPreciosSugeridos()");
}
}

/* ══════════════════════════════════════════════════════════════
   APLICAR PRECIOS SUGERIDOS AL PRECIO REAL
   ⚠️ ESTA ACCIÓN MODIFICA LA COLUMNA "precio"
   Ejecutar calcularPreciosConMargen() primero para revisar.
══════════════════════════════════════════════════════════════ */
function aplicarPreciosSugeridos() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) { Logger.log("Hoja Productos no encontrada"); return; }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });

  var precioIdx  = headers.indexOf("precio")          + 1;
  var sugIdx     = headers.indexOf("precio_sugerido") + 1;
  var ganIdx     = headers.indexOf("ganancia_pct")    + 1;
  var costoIdx   = headers.indexOf("costo")           + 1;

  if (!sugIdx) {
    Logger.log("No hay columna precio_sugerido. Ejecuta calcularPreciosConMargen() primero.");
    return;
  }

    // Ejecuta calcularPreciosConMargen() primero para revisar los precios.

  var aplicados = 0;
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var sugerido = Number(data[i][sugIdx - 1]);
    if (!sugerido || sugerido <= 0) continue;

    // Actualizar precio
    sheet.getRange(i + 1, precioIdx).setValue(sugerido)
      .setNumberFormat("$ #,##0").setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");

    // Recalcular ganancia
    if (ganIdx && costoIdx) {
      var costo = Number(data[i][costoIdx - 1]);
      if (costo > 0) {
        var ganancia = Math.round(((sugerido - costo) / costo) * 100 * 10) / 10;
        var ganCell  = sheet.getRange(i + 1, ganIdx);
        ganCell.clearFormat();
        ganCell.setValue(ganancia + "%");
        ganCell.setBackground(ganancia >= 30 ? "#DCFCE7" : ganancia >= 10 ? "#FEF9C3" : "#FEE2E2")
               .setFontColor(ganancia >= 30 ? "#166534" : ganancia >= 10 ? "#854D0E" : "#991B1B")
               .setFontWeight("bold");
      }
    }
    aplicados++;
  }
  Logger.log("✅ Precios aplicados: " + aplicados + " productos actualizados en la columna precio.");
}
