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

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/* ──────────────────────────────────────────────────────────────
   GET — productos para la web
────────────────────────────────────────────────────────────── */
function doGet(e) {
  if (e.parameter.action === "productos") {
    const sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Productos");
    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows    = data.slice(1)
      .filter(row => row[0] !== "")
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    return jsonResponse({ ok: true, data: rows });
  }
  return jsonResponse({ ok: false, error: "Accion no reconocida" });
}

/* ──────────────────────────────────────────────────────────────
   POST — guarda pedido y actualiza cliente
────────────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.openById(SHEET_ID);
    guardarPedido(ss, body);
    if (body.telefono) upsertCliente(ss, body);
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
    body.pago          || "",
    body.zona_envio    || "",
    body.costo_envio   || 0,
    body.subtotal      || 0,
    body.total         || 0,
    body.estado_pago   || "PENDIENTE",
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
function populateProductos() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let sheet   = ss.getSheetByName("Productos");
  if (!sheet) sheet = ss.insertSheet("Productos");

  // PROTECCION: si ya hay datos, no borrar nada
  // Solo ejecutar si la hoja está vacía o si se pasa force=true
  if (sheet.getLastRow() > 1) {
    Logger.log(
      "ADVERTENCIA: La hoja 'Productos' ya tiene " + (sheet.getLastRow() - 1) + " filas de datos.\n" +
      "No se realizaron cambios para proteger tu informacion.\n" +
      "Si deseas resetear, llama a populateProductos(true)"
    );
    return;
  }

  sheet.clearContents();

  const headers = ["id","nombre","tamano","precio","categoria","destacado","emoji","descripcion","imagen"];
  sheet.appendRow(headers);

  const hdr = sheet.getRange(1, 1, 1, headers.length);
  hdr.setFontWeight("bold").setBackground("#CCFBF1").setFontColor("#0F766E");

  // Columna imagen en amarillo para que sea fácil de identificar
  sheet.getRange(1, 9, 1, 1).setBackground("#FFF176").setFontColor("#5F4000");
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
    [1,"Cera Autobrillante Envase","1 Kg",16000,"Ceras",false,"✨","Cera autobrillante de alta calidad para pisos. Brinda proteccion y brillo duradero.",""],
    [2,"Cera Autobrillante Galon","4 Kg",46333.68,"Ceras",false,"✨","Presentacion galon para uso intensivo. Ideal para negocios o grandes superficies.",""],
    [3,"Detergente Textil Galon","4 Kg",26743.72,"Detergentes",false,"🧺","Potente formula para ropa de todo tipo. Elimina manchas dificiles.",""],
    [4,"Desengrasante Multiusos Linea Hogar Envase","1 Kg",10700,"Detergentes",true,"🧽","Desengrasante multiusos para cocinas, banos y superficies.",""],
    [5,"Desengrasante Multiusos Linea Hogar Galon","4 Kg",37300,"Detergentes",false,"🧽","Presentacion galon del desengrasante multiusos. Rendimiento profesional.",""],
    [6,"Detergente Textil","1 Kg",16000,"Detergentes",false,"🧺","Detergente textil ideal para lavado a mano y maquina.",""],
    [7,"Detergente Textil","2 Kg",15000,"Detergentes",true,"🧺","Presentacion de 2 Kg perfecta para familias. Formula concentrada.",""],
    [8,"Fragancia Irresistible Dude","100 ml",38034.99,"Fragancias",false,"🌸","Fragancia masculina intensa y seductora. Notas amaderadas con toques frescos.",""],
    [9,"Fragancia Golden Gladiator","100 ml",36459.43,"Fragancias",false,"🌸","Fragancia poderosa con notas doradas y especiadas.",""],
    [10,"Fragancia Happiness","100 ml",49004.21,"Fragancias",false,"🌸","Fragancia alegre y fresca que evoca momentos de felicidad.",""],
    [11,"Fragancia Bad Girl Gone Good","100 ml",52195.74,"Fragancias",false,"🌸","Fragancia audaz y sofisticada. Combinacion de dulzura y misterio.",""],
    [12,"Fragancia Luxury Amber","100 ml",36341.97,"Fragancias",false,"🌸","Esencia ambar con notas calidas y lujosas.",""],
    [13,"Fragancia Sublime","100 ml",36341.97,"Fragancias",false,"🌸","Fragancia delicada con notas florales de elegancia incomparable.",""],
    [14,"Fragancia Millonaire","100 ml",57093.81,"Fragancias",false,"🌸","La fragancia mas lujosa de la coleccion. Opulenta y exclusiva.",""],
    [15,"Fragancia Kingdom","100 ml",36459.43,"Fragancias",false,"🌸","Majestuosa fragancia con caracter y personalidad propia.",""],
    [16,"Fragancia Aquaman","100 ml",47108.35,"Fragancias",false,"🌸","Fragancia acuatica y refrescante. Evoca la frescura del oceano.",""],
    [17,"Fragancia Fanning","100 ml",33665.10,"Fragancias",false,"🌸","Esencia ligera y versatil. Perfecta para uso diario.",""],
    [18,"Fragancia Pomelo & Granada","100 ml",29750,"Fragancias",false,"🌸","Combinacion frutal vibrante de pomelo y granada.",""],
    [19,"Fragancia Perfume Marine","100 ml",29750,"Fragancias",false,"🌸","Fragancia marina limpia y fresca con notas acuaticas.",""],
    [20,"Fragancia Pastel Dream","100 ml",29750,"Fragancias",false,"🌸","Dulce y sonadora. Notas pastel suaves y romanticas.",""],
    [21,"Fragancia Shine Alight","100 ml",29750,"Fragancias",false,"🌸","Fragancia luminosa y positiva como un rayo de sol.",""],
    [22,"Fragancia The Boss Perfume","100 ml",35700,"Fragancias",false,"🌸","Para el verdadero lider. Fragancia poderosa y dominante.",""],
    [23,"Fragancia LG Silverhill","100 ml",29750,"Fragancias",false,"🌸","Fragancia plateada y sofisticada. Fresca y con personalidad.",""],
    [24,"Fragancia Platinum","100 ml",29750,"Fragancias",false,"🌸","La pureza del platino en fragancia. Elegante y atemporal.",""],
    [25,"Gel Antibacterial Para Manos Galon","3.5 Kg",35590.89,"Antibacteriales",false,"🤲","Gel antibacterial de gran rendimiento. Elimina 99.9% de germenes.",""],
    [26,"Gel Antibacterial Para Manos","500 gr",7735,"Antibacteriales",false,"🤲","Gel antibacterial personal. Formula suave con el cutis.",""],
    [27,"Gel Antibacterial Para Manos","1000 gr",14280,"Antibacteriales",false,"🤲","Presentacion familiar de gel antibacterial protector.",""],
    [28,"Jabon Antibacterial Para Manos Galon","4 Kg",28560,"Antibacteriales",false,"🧼","Jabon liquido antibacterial en galon para dispensadores.",""],
    [29,"Jabon Antibacterial Para Manos","500 gr",6584.27,"Antibacteriales",false,"🧼","Jabon antibacterial economico y eficaz para manos.",""],
    [30,"Jabon Antibacterial Para Manos","1000 gr",11971.40,"Antibacteriales",false,"🧼","Jabon liquido antibacterial familiar. Limpia y cuida.",""],
    [31,"Lavaloza Liquido Galon","4 Kg",31953.28,"Lavaloza",false,"🍽️","Lavaloza concentrado. Elimina la grasa de utensilios con facilidad.",""],
    [32,"Lavaloza Liquido Envase","500 gr",6000,"Lavaloza",false,"🍽️","Presentacion individual de lavaloza. Deja ollas brillantes.",""],
    [33,"Lavaloza Liquido Envase","1000 gr",10000,"Lavaloza",false,"🍽️","Presentacion de 1 Kg de lavaloza. Excelente rendimiento familiar.",""],
    [34,"Limpiapisos Encanto Tropical Envase","1 Kg",9000,"Limpiapisos",true,"🌿","Limpiapisos tropical. Limpia y desinfecta dejando olor fresco.",""],
    [35,"Limpiapisos Encanto Tropical Galon","4 Kg",24370.43,"Limpiapisos",false,"🌿","Galon limpiapisos tropical. Rendimiento profesional.",""],
    [36,"Limpiapisos Encanto Tropical Envase","500 gr",6500,"Limpiapisos",true,"🌿","Presentacion pequena del limpiapisos. Practica y economica.",""],
    [37,"Limpiapisos Encanto Tropical Envase","1000 gr",11000,"Limpiapisos",true,"🌿","Tamano familiar limpiapisos tropical. Aroma duradero.",""],
    [38,"Limpia Vidrios Envase","500 gr",5500,"Limpia Vidrios",false,"🪟","Limpiador de vidrios sin rayas. Deja superficies cristalinas.",""],
    [39,"Limpia Vidrios Envase","1 Kg",8000,"Limpia Vidrios",true,"🪟","1 Kg limpia vidrios. Formula antivaho de claridad total.",""],
    [40,"Limpia Vidrios Galon","4 Kg",27370,"Limpia Vidrios",false,"🪟","Galon limpia vidrios. Ideal para edificios y comercios.",""],
    [41,"Oxigeno Activo","1 Kg",12500,"Otros",true,"💧","Blanqueador de oxigeno activo. Sin cloro, cuida colores.",""],
    [42,"Suavizante Galon","4 Kg",21420,"Otros",false,"🌺","Suavizante textil de larga duracion. Ropa suave y fragante.",""],
    [43,"Suavizante Galon","1000 gr",10000,"Otros",false,"🌺","Suavizante 1 Kg. Cuida fibras y perfuma la ropa.",""],
    [44,"Suavizante Galon","2000 gr",17000,"Otros",true,"🌺","Suavizante 2 Kg familiar. Fragancia duradera y economico.",""],
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
function inicializarPedidos() {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName("Pedidos");
  if (!sheet) sheet = ss.insertSheet("Pedidos");

  if (sheet.getLastRow() === 0) {
    const h = ["fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
               "casa","conjunto","nota","pago","zona_envio","costo_envio","subtotal","total",
               "estado_pago","productos"];
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setFontWeight("bold").setBackground("#0D9488").setFontColor("#fff");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, h.length);
    sheet.getRange(2,13,1000,3).setNumberFormat("$ #,##0.00");
  }
  Logger.log('OK: hoja "Pedidos" lista.');
}

/* ──────────────────────────────────────────────────────────────
   INICIALIZAR CLIENTES
────────────────────────────────────────────────────────────── */
function inicializarClientes() {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName("Clientes");
  if (!sheet) sheet = ss.insertSheet("Clientes");

  if (sheet.getLastRow() === 0) {
    const h = ["primera_compra","ultima_compra","nombre","telefono","ciudad",
               "barrio","direccion","total_pedidos","total_gastado","tipo"];
    sheet.appendRow(h);
    sheet.getRange(1,1,1,h.length).setFontWeight("bold").setBackground("#14B8A6").setFontColor("#fff");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, h.length);
    sheet.getRange(2,9,1000,1).setNumberFormat("$ #,##0.00");
    sheet.getRange(1,10).setNote(
      "Clasificacion automatica:\n" +
      "Nuevo      = 1 pedido\n" +
      "Recurrente = 2+ pedidos o $150.000+\n" +
      "VIP        = 10+ pedidos o $500.000+"
    );
  }
  Logger.log('OK: hoja "Clientes" lista.');
}

/* ══════════════════════════════════════════════════════════════
   BACKUP MANUAL — ejecutar antes de cualquier cambio grande
   Crea copias de seguridad de las 3 hojas con fecha y hora
══════════════════════════════════════════════════════════════ */
function hacerBackup() {
  const ss      = SpreadsheetApp.openById(SHEET_ID);
  const fecha   = Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd HH:mm");
  const hojas   = ["Productos", "Pedidos", "Clientes"];
  const creadas = [];

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) return;
    const copia = sheet.copyTo(ss);
    copia.setName("BKP " + nombre + " " + fecha);
    // Mover la copia al final
    ss.setActiveSheet(copia);
    ss.moveActiveSheet(ss.getNumSheets());
    creadas.push("BKP " + nombre + " " + fecha);
  });

  Logger.log(
    "=== BACKUP COMPLETADO ===\n" +
    "Hojas de respaldo creadas:\n" +
    creadas.join("\n") + "\n\n" +
    "Puedes eliminarlas cuando ya no las necesites."
  );
}

/* ══════════════════════════════════════════════════════════════
   ELIMINAR BACKUPS ANTIGUOS
   Borra todas las hojas que empiecen con "BKP"
══════════════════════════════════════════════════════════════ */
function limpiarBackups() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const hojas = ss.getSheets();
  let count   = 0;

  hojas.forEach(sheet => {
    if (sheet.getName().startsWith("BKP")) {
      ss.deleteSheet(sheet);
      count++;
    }
  });

  Logger.log("Backups eliminados: " + count);
}

/* ══════════════════════════════════════════════════════════════
   AUTO-TABLA
   Aplica formato de tabla profesional a las 3 hojas.
   Se ejecuta automáticamente cada vez que se agrega una fila
   gracias al disparador instalado con instalarDisparador().
══════════════════════════════════════════════════════════════ */

// Paleta de colores por hoja
const TEMAS = {
  "Productos": {
    hdrBg:   "#0F766E",  // encabezado fondo
    hdrFg:   "#FFFFFF",  // encabezado texto
    rowPar:  "#F0FDF9",  // fila par
    rowImpar:"#FFFFFF",  // fila impar
    border:  "#99F6E4",  // color de bordes
    imgCol:  "#FFF9C4",  // columna imagen (amarillo suave)
  },
  "Pedidos": {
    hdrBg:   "#0D9488",
    hdrFg:   "#FFFFFF",
    rowPar:  "#F0FDF9",
    rowImpar:"#FFFFFF",
    border:  "#99F6E4",
    imgCol:  null,
  },
  "Clientes": {
    hdrBg:   "#14B8A6",
    hdrFg:   "#FFFFFF",
    rowPar:  "#ECFDF5",
    rowImpar:"#FFFFFF",
    border:  "#6EE7B7",
    imgCol:  null,
  },
};

/* ──────────────────────────────────────────────────────────────
   Formatea una hoja como tabla completa
────────────────────────────────────────────────────────────── */
function formatearComoTabla(nombreHoja) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) {
    Logger.log("Hoja no encontrada: " + nombreHoja);
    return;
  }

  const tema      = TEMAS[nombreHoja] || TEMAS["Pedidos"];
  const lastRow   = Math.max(sheet.getLastRow(), 2);
  const lastCol   = sheet.getLastColumn();
  if (lastCol === 0) return;

  const totalRows = lastRow;

  // ── 1. Encabezado ──────────────────────────────────────────
  const hdrRange = sheet.getRange(1, 1, 1, lastCol);
  hdrRange
    .setBackground(tema.hdrBg)
    .setFontColor(tema.hdrFg)
    .setFontWeight("bold")
    .setFontSize(10)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true,
               tema.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  if (totalRows < 2) return;

  // ── 2. Filas de datos con colores alternados ───────────────
  for (let r = 2; r <= totalRows; r++) {
    const rowRange = sheet.getRange(r, 1, 1, lastCol);
    const bg       = r % 2 === 0 ? tema.rowPar : tema.rowImpar;
    rowRange
      .setBackground(bg)
      .setFontColor("#0F172A")
      .setFontWeight("normal")
      .setFontSize(10)
      .setVerticalAlignment("middle")
      .setBorder(true, true, true, true, true, true,
                 tema.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.setRowHeight(r, 28);
  }

  // ── 3. Columna imagen en amarillo (solo Productos) ─────────
  if (tema.imgCol) {
    const headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const imgIndex = headers.indexOf("imagen");
    if (imgIndex !== -1) {
      const col = imgIndex + 1;
      sheet.getRange(1, col, totalRows, 1).setBackground(tema.imgCol);
    }
  }

  // ── 4. Columna "tipo" en Clientes con color por nivel ─────
  if (nombreHoja === "Clientes" && totalRows >= 2) {
    const headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const tipoIdx  = headers.indexOf("tipo");
    if (tipoIdx !== -1) {
      const col      = tipoIdx + 1;
      const valores  = sheet.getRange(2, col, totalRows - 1, 1).getValues();
      valores.forEach((row, i) => {
        const cell = sheet.getRange(i + 2, col);
        const val  = String(row[0]).toLowerCase();
        if (val.includes("vip")) {
          cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        } else if (val.includes("recurrente")) {
          cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
        } else {
          cell.setBackground("#EFF6FF").setFontColor("#1E40AF").setFontWeight("normal");
        }
      });
    }
  }

  // ── 5. Columna "estado_pago" en Pedidos con color ─────────
  if (nombreHoja === "Pedidos" && totalRows >= 2) {
    const headers     = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const estadoIdx   = headers.indexOf("estado_pago");
    if (estadoIdx !== -1) {
      const col    = estadoIdx + 1;
      const valores = sheet.getRange(2, col, totalRows - 1, 1).getValues();
      valores.forEach((row, i) => {
        const cell = sheet.getRange(i + 2, col);
        const val  = String(row[0]).toUpperCase();
        if (val.includes("PAGADO")) {
          cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
        } else if (val.includes("CONTRA")) {
          cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
        } else {
          cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
        }
      });
    }
  }

  // ── 6. Ajustar anchos de columna ──────────────────────────
  sheet.autoResizeColumns(1, lastCol);

  Logger.log("Tabla formateada: " + nombreHoja + " (" + (totalRows - 1) + " filas)");
}

/* ──────────────────────────────────────────────────────────────
   Formatea las 3 hojas de una vez
────────────────────────────────────────────────────────────── */
function formatearTodo() {
  formatearComoTabla("Productos");
  formatearComoTabla("Pedidos");
  formatearComoTabla("Clientes");
  Logger.log("=== Todas las tablas formateadas ===");
}

/* ══════════════════════════════════════════════════════════════
   DISPARADOR AUTOMÁTICO
   Instala un trigger que formatea la hoja cada vez que
   se edita o agrega una fila nueva.
   Ejecutar instalarDisparador() UNA sola vez.
══════════════════════════════════════════════════════════════ */
function instalarDisparador() {
  // Eliminar disparadores anteriores del mismo tipo para no duplicar
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "onEditar") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Instalar disparador onEdit para el spreadsheet
  ScriptApp.newTrigger("onEditar")
    .forSpreadsheet(SpreadsheetApp.openById(SHEET_ID))
    .onEdit()
    .create();

  Logger.log("Disparador instalado. Las tablas se formatearán automáticamente.");
}

/* ──────────────────────────────────────────────────────────────
   HANDLER del disparador — se ejecuta en cada edición
────────────────────────────────────────────────────────────── */
function onEditar(e) {
  if (!e) return;
  const nombreHoja = e.range.getSheet().getName();
  // Solo formatear las hojas principales, no los backups
  if (["Productos", "Pedidos", "Clientes"].includes(nombreHoja)) {
    formatearComoTabla(nombreHoja);
  }
}

/* ══════════════════════════════════════════════════════════════
   REPARAR COLUMNAS — ejecutar UNA vez si las columnas están
   desplazadas porque "telefono" no estaba en la hoja original.

   QUÉ HACE:
   1. Inserta la columna "telefono" en la posición correcta (col 3)
   2. Ajusta el formato de toda la fila de encabezados
   3. NO borra ningún dato existente

   CUÁNDO EJECUTAR:
   → Si la hoja "Pedidos" tiene datos pero sin columna "telefono"
══════════════════════════════════════════════════════════════ */
function repararColumnasPedidos() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("Pedidos");
  if (!sheet) { Logger.log("Hoja Pedidos no encontrada"); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log("Encabezados actuales: " + headers.join(" | "));

  // Verificar si ya existe la columna telefono
  if (headers.includes("telefono")) {
    Logger.log("La columna 'telefono' ya existe. No se realizaron cambios.");
    return;
  }

  // Insertar columna en posición 3 (después de "nombre")
  sheet.insertColumnAfter(2); // columna 2 = nombre → inserta col 3 nueva

  // Poner el encabezado
  const hdrCell = sheet.getRange(1, 3);
  hdrCell.setValue("telefono");
  hdrCell.setBackground("#0D9488").setFontColor("#fff").setFontWeight("bold");

  // Rellenar la nueva columna con vacío en filas existentes (ya está vacía, solo formatea)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 3, lastRow - 1, 1)
      .setBackground("#FFFFFF")
      .setFontColor("#0F172A")
      .setValue("");
  }

  sheet.autoResizeColumn(3);

  Logger.log(
    "Columna 'telefono' insertada en posicion 3.\n" +
    "Los pedidos anteriores quedan con telefono vacío (normal).\n" +
    "Los nuevos pedidos ya guardarán el teléfono correctamente."
  );
}

/* ──────────────────────────────────────────────────────────────
   VERIFICAR columnas de todas las hojas — diagnóstico
────────────────────────────────────────────────────────────── */
function verificarEstructura() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const hojas = ["Productos", "Pedidos", "Clientes"];

  const esperado = {
    "Productos": ["id","nombre","tamano","precio","categoria","destacado","emoji","descripcion","imagen"],
    "Pedidos":   ["fecha","nombre","telefono","ciudad","departamento","barrio","direccion",
                  "casa","conjunto","nota","pago","zona_envio","costo_envio","subtotal","total",
                  "estado_pago","productos"],
    "Clientes":  ["primera_compra","ultima_compra","nombre","telefono","ciudad",
                  "barrio","direccion","total_pedidos","total_gastado","tipo"],
  };

  hojas.forEach(nombre => {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet) { Logger.log("FALTA la hoja: " + nombre); return; }

    const actuales = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const esp      = esperado[nombre];
    let ok = true;

    esp.forEach((col, i) => {
      if (actuales[i] !== col) {
        Logger.log("ERROR en " + nombre + " col " + (i+1) +
                   ": esperado='" + col + "' actual='" + actuales[i] + "'");
        ok = false;
      }
    });

    if (ok) {
      Logger.log("OK: " + nombre + " (" + actuales.length + " columnas correctas)");
    }
  });
}