/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Setup y Utilidades (LIMPIEZARR_Setup.gs)
   Crea este como un segundo archivo en el mismo proyecto Apps Script.
   Todas las funciones son accesibles desde LIMPIEZARR.gs.
═══════════════════════════════════════════════════════════ */

function populateProductos(forzar) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Productos");
  if (!sheet) sheet = ss.insertSheet("Productos");

  // PROTECCION: si ya hay datos y no se fuerza, no borrar nada
  if (!forzar && sheet.getLastRow() > 1) {
    Logger.log(
      "ADVERTENCIA: La hoja Productos ya tiene " + (sheet.getLastRow() - 1) + " filas. " +
      "Para recrearla ejecuta resetearProductos()"
    );
    return;
  }

  sheet.clearContents();

  const headers = ["id","nombre","tamano","precio","categoria","destacado","emoji","descripcion","imagen","imagen2","imagen3","stock"];
  sheet.appendRow(headers);

  const hdr = sheet.getRange(1, 1, 1, headers.length);
  hdr.setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");

  // Columna imagen en amarillo para que sea fácil de identificar
  sheet.getRange(1, 9, 1, 1).setBackground("#FFF176").setFontColor("#5F4000");
  // Notas en columnas imagen y stock
  sheet.getRange(1, 10).setNote("imagen2: segunda foto del producto (URL Drive o externa)");
  sheet.getRange(1, 11).setNote("imagen3: tercera foto del producto (URL Drive o externa)");
  sheet.getRange(1, 12).setNote(
    "STOCK:\n" +
    "- Vacío = sin control de inventario\n" +
    "- 0 = agotado (no se puede comprar)\n" +
    "- Número = unidades disponibles"
  );
  sheet.getRange(1, 9).setNote(
    "COMO AGREGAR IMAGEN:\n\n" +
    "1. Sube la foto a Google Drive\n" +
    "2. Click derecho sobre el archivo\n" +
    "3. 'Obtener enlace' -> Cambia a 'Cualquier persona'\n" +
    "4. Copia el enlace y pegalo aqui\n\n" +
    "El sistema lo convierte automaticamente.\n" +
    "Si esta vacio se muestra el emoji."
  );

  const rows = [
    [1,"Cera Autobrillante Envase","1 Kg",16000,"Ceras",false,"✨","Cera autobrillante de alta calidad para pisos. Brinda proteccion y brillo duradero.","","","",""],
    [2,"Cera Autobrillante Galon","4 Kg",46333.68,"Ceras",false,"✨","Presentacion galon para uso intensivo. Ideal para negocios o grandes superficies.","","","",""],
    [3,"Detergente Textil Galon","4 Kg",26743.72,"Detergentes",false,"🧺","Potente formula para ropa de todo tipo. Elimina manchas dificiles.","","","",""],
    [4,"Desengrasante Multiusos Linea Hogar Envase","1 Kg",10700,"Detergentes",true,"🧽","Desengrasante multiusos para cocinas, banos y superficies.","","","",""],
    [5,"Desengrasante Multiusos Linea Hogar Galon","4 Kg",37300,"Detergentes",false,"🧽","Presentacion galon del desengrasante multiusos. Rendimiento profesional.","","","",""],
    [6,"Detergente Textil","1 Kg",16000,"Detergentes",false,"🧺","Detergente textil ideal para lavado a mano y maquina.","","","",""],
    [7,"Detergente Textil","2 Kg",15000,"Detergentes",true,"🧺","Presentacion de 2 Kg perfecta para familias. Formula concentrada.","","","",""],
    [8,"Fragancia Irresistible Dude","100 ml",38034.99,"Fragancias",false,"🌸","Fragancia masculina intensa y seductora. Notas amaderadas con toques frescos.","","","",""],
    [9,"Fragancia Golden Gladiator","100 ml",36459.43,"Fragancias",false,"🌸","Fragancia poderosa con notas doradas y especiadas.","","","",""],
    [10,"Fragancia Happiness","100 ml",49004.21,"Fragancias",false,"🌸","Fragancia alegre y fresca que evoca momentos de felicidad.","","","",""],
    [11,"Fragancia Bad Girl Gone Good","100 ml",52195.74,"Fragancias",false,"🌸","Fragancia audaz y sofisticada. Combinacion de dulzura y misterio.","","","",""],
    [12,"Fragancia Luxury Amber","100 ml",36341.97,"Fragancias",false,"🌸","Esencia ambar con notas calidas y lujosas.","","","",""],
    [13,"Fragancia Sublime","100 ml",36341.97,"Fragancias",false,"🌸","Fragancia delicada con notas florales de elegancia incomparable.","","","",""],
    [14,"Fragancia Millonaire","100 ml",57093.81,"Fragancias",false,"🌸","La fragancia mas lujosa de la coleccion. Opulenta y exclusiva.","","","",""],
    [15,"Fragancia Kingdom","100 ml",36459.43,"Fragancias",false,"🌸","Majestuosa fragancia con caracter y personalidad propia.","","","",""],
    [16,"Fragancia Aquaman","100 ml",47108.35,"Fragancias",false,"🌸","Fragancia acuatica y refrescante. Evoca la frescura del oceano.","","","",""],
    [17,"Fragancia Fanning","100 ml",33665.10,"Fragancias",false,"🌸","Esencia ligera y versatil. Perfecta para uso diario.","","","",""],
    [18,"Fragancia Pomelo & Granada","100 ml",29750,"Fragancias",false,"🌸","Combinacion frutal vibrante de pomelo y granada.","","","",""],
    [19,"Fragancia Perfume Marine","100 ml",29750,"Fragancias",false,"🌸","Fragancia marina limpia y fresca con notas acuaticas.","","","",""],
    [20,"Fragancia Pastel Dream","100 ml",29750,"Fragancias",false,"🌸","Dulce y sonadora. Notas pastel suaves y romanticas.","","","",""],
    [21,"Fragancia Shine Alight","100 ml",29750,"Fragancias",false,"🌸","Fragancia luminosa y positiva como un rayo de sol.","","","",""],
    [22,"Fragancia The Boss Perfume","100 ml",35700,"Fragancias",false,"🌸","Para el verdadero lider. Fragancia poderosa y dominante.","","","",""],
    [23,"Fragancia LG Silverhill","100 ml",29750,"Fragancias",false,"🌸","Fragancia plateada y sofisticada. Fresca y con personalidad.","","","",""],
    [24,"Fragancia Platinum","100 ml",29750,"Fragancias",false,"🌸","La pureza del platino en fragancia. Elegante y atemporal.","","","",""],
    [25,"Gel Antibacterial Para Manos Galon","3.5 Kg",35590.89,"Antibacteriales",false,"🤲","Gel antibacterial de gran rendimiento. Elimina 99.9% de germenes.","","","",""],
    [26,"Gel Antibacterial Para Manos","500 gr",7735,"Antibacteriales",false,"🤲","Gel antibacterial personal. Formula suave con el cutis.","","","",""],
    [27,"Gel Antibacterial Para Manos","1000 gr",14280,"Antibacteriales",false,"🤲","Presentacion familiar de gel antibacterial protector.","","","",""],
    [28,"Jabon Antibacterial Para Manos Galon","4 Kg",28560,"Antibacteriales",false,"🧼","Jabon liquido antibacterial en galon para dispensadores.","","","",""],
    [29,"Jabon Antibacterial Para Manos","500 gr",6584.27,"Antibacteriales",false,"🧼","Jabon antibacterial economico y eficaz para manos.","","","",""],
    [30,"Jabon Antibacterial Para Manos","1000 gr",11971.40,"Antibacteriales",false,"🧼","Jabon liquido antibacterial familiar. Limpia y cuida.","","","",""],
    [31,"Lavaloza Liquido Galon","4 Kg",31953.28,"Lavaloza",false,"🍽️","Lavaloza concentrado. Elimina la grasa de utensilios con facilidad.","","","",""],
    [32,"Lavaloza Liquido Envase","500 gr",6000,"Lavaloza",false,"🍽️","Presentacion individual de lavaloza. Deja ollas brillantes.","","","",""],
    [33,"Lavaloza Liquido Envase","1000 gr",10000,"Lavaloza",false,"🍽️","Presentacion de 1 Kg de lavaloza. Excelente rendimiento familiar.","","","",""],
    [34,"Limpiapisos Encanto Tropical Envase","1 Kg",9000,"Limpiapisos",true,"🌿","Limpiapisos tropical. Limpia y desinfecta dejando olor fresco.","","","",""],
    [35,"Limpiapisos Encanto Tropical Galon","4 Kg",24370.43,"Limpiapisos",false,"🌿","Galon limpiapisos tropical. Rendimiento profesional.","","","",""],
    [36,"Limpiapisos Encanto Tropical Envase","500 gr",6500,"Limpiapisos",true,"🌿","Presentacion pequena del limpiapisos. Practica y economica.","","","",""],
    [37,"Limpiapisos Encanto Tropical Envase","1000 gr",11000,"Limpiapisos",true,"🌿","Tamano familiar limpiapisos tropical. Aroma duradero.","","","",""],
    [38,"Limpia Vidrios Envase","500 gr",5500,"Limpia Vidrios",false,"🪟","Limpiador de vidrios sin rayas. Deja superficies cristalinas.","","","",""],
    [39,"Limpia Vidrios Envase","1 Kg",8000,"Limpia Vidrios",true,"🪟","1 Kg limpia vidrios. Formula antivaho de claridad total.","","","",""],
    [40,"Limpia Vidrios Galon","4 Kg",27370,"Limpia Vidrios",false,"🪟","Galon limpia vidrios. Ideal para edificios y comercios.","","","",""],
    [41,"Oxigeno Activo","1 Kg",12500,"Otros",true,"💧","Blanqueador de oxigeno activo. Sin cloro, cuida colores.","","","",""],
    [42,"Suavizante Galon","4 Kg",21420,"Otros",false,"🌺","Suavizante textil de larga duracion. Ropa suave y fragante.","","","",""],
    [43,"Suavizante Galon","1000 gr",10000,"Otros",false,"🌺","Suavizante 1 Kg. Cuida fibras y perfuma la ropa.","","","",""],
    [44,"Suavizante Galon","2000 gr",17000,"Otros",true,"🌺","Suavizante 2 Kg familiar. Fragancia duradera y economico.","","","",""],
  ];

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat("$ #,##0.00");

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