/**
 * ═══════════════════════════════════════════════════════════════
 *  LIMPIEZA RR — Google Apps Script
 *  
 *  INSTRUCCIONES:
 *  1. Pega este código en Apps Script (Extensiones → Apps Script)
 *  2. Ejecuta populateProductos() UNA SOLA VEZ para llenar el Sheet
 *  3. Publica como Web App (Implementar → Nueva implementación)
 *  4. ¡Listo! Edita los productos directo en Sheets cuando quieras
 * ═══════════════════════════════════════════════════════════════
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/* ─────────────────────────────────────────────────────────────
   GET — Lee productos desde la hoja "Productos"
   URL: ...exec?action=productos
───────────────────────────────────────────────────────────── */
function doGet(e) {
  const action = e.parameter.action;

  if (action === "productos") {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Productos");
    const data  = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1)
      .filter(row => row[0] !== "")           // ignorar filas vacías
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: "Acción no reconocida" }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ─────────────────────────────────────────────────────────────
   POST — Guarda un pedido nuevo en la hoja "Pedidos"
───────────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    const body  = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Pedidos");

    sheet.appendRow([
      new Date().toLocaleString("es-CO"), // fecha
      body.nombre         || "",          // nombre
      body.ciudad         || "",          // ciudad
      body.departamento   || "",          // departamento
      body.barrio         || "",          // barrio
      body.direccion      || "",          // direccion
      body.casa           || "",          // casa
      body.conjunto       || "",          // conjunto
      body.nota           || "",          // nota
      body.pago           || "",          // medio de pago
      body.zona_envio     || "",          // zona envío
      body.costo_envio    ?? "",          // costo envío
      body.subtotal       || 0,           // subtotal productos
      body.total          || 0,           // total con envío
      body.estado_pago    || "PENDIENTE", // estado_pago
      body.productos      || "",          // detalle productos
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ─────────────────────────────────────────────────────────────
   SINCRONIZACIÓN INICIAL
   Ejecuta esta función UNA SOLA VEZ desde el editor de Apps Script
   para poblar la hoja "Productos" con los datos de la web.
   
   Después de ejecutarla, edita los productos directo en Sheets.
───────────────────────────────────────────────────────────── */
function populateProductos() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let sheet   = ss.getSheetByName("Productos");

  // Si no existe la pestaña, la crea
  if (!sheet) {
    sheet = ss.insertSheet("Productos");
  }

  // Limpia el contenido actual (por si ya había datos)
  sheet.clearContents();

  // Encabezados
  const headers = ["id", "nombre", "tamaño", "precio", "categoria", "destacado", "emoji", "descripcion"];
  sheet.appendRow(headers);

  // Formato de encabezados: negrita + fondo verde claro
  const hdrRange = sheet.getRange(1, 1, 1, headers.length);
  hdrRange.setFontWeight("bold");
  hdrRange.setBackground("#CCFBF1");
  hdrRange.setFontColor("#0F766E");

  // ── Datos de productos (sincronizados desde la web) ──────────
  const productos = [
    // Ceras
    [1,  "Cera Autobrillante Envase",                  "1 Kg",    16000,    "Ceras",           false, "✨", "Cera autobrillante de alta calidad para pisos. Brinda protección y brillo duradero. Fácil aplicación y secado rápido."],
    [2,  "Cera Autobrillante Galón",                   "4 Kg",    46333.68, "Ceras",           false, "✨", "Presentación galón para uso intensivo. Ideal para negocios o grandes superficies. Excelente rendimiento y brillo profesional."],
    // Detergentes
    [3,  "Detergente Textil Galón",                    "4 Kg",    26743.72, "Detergentes",     false, "🧺", "Potente fórmula para ropa de todo tipo. Elimina manchas difíciles y cuida las fibras del tejido con gran rendimiento."],
    [4,  "Desengrasante Multiusos Línea Hogar Envase", "1 Kg",    10700,    "Detergentes",     true,  "🧽", "Desengrasante multiusos para cocinas, baños y superficies. Elimina grasa y suciedad incrustada eficazmente."],
    [5,  "Desengrasante Multiusos Línea Hogar Galón",  "4 Kg",    37300,    "Detergentes",     false, "🧽", "Presentación galón del desengrasante multiusos. Rendimiento profesional para limpieza intensa en grandes espacios."],
    [6,  "Detergente Textil",                          "1 Kg",    16000,    "Detergentes",     false, "🧺", "Detergente textil ideal para el lavado a mano y máquina. Suave con las prendas, duro con las manchas."],
    [7,  "Detergente Textil",                          "2 Kg",    15000,    "Detergentes",     true,  "🧺", "Presentación de 2 Kg perfecta para familias. Fórmula concentrada que rinde mucho más por cada lavado."],
    // Fragancias
    [8,  "Fragancia Irresistible Dude",                "100 ml",  38034.99, "Fragancias",      false, "🌸", "Fragancia masculina intensa y seductora. Notas amaderadas con toques frescos que perduran todo el día."],
    [9,  "Fragancia Golden Gladiator",                 "100 ml",  36459.43, "Fragancias",      false, "🌸", "Fragancia poderosa con notas doradas y especiadas. Una esencia que impone presencia y distinción."],
    [10, "Fragancia Happiness",                        "100 ml",  49004.21, "Fragancias",      false, "🌸", "Fragancia alegre y fresca que evoca momentos de felicidad. Floral y vibrante para todo el día."],
    [11, "Fragancia Bad Girl Gone Good",               "100 ml",  52195.74, "Fragancias",      false, "🌸", "Fragancia audaz y sofisticada. Combinación perfecta entre dulzura y misterio irresistible."],
    [12, "Fragancia Luxury Amber",                     "100 ml",  36341.97, "Fragancias",      false, "🌸", "Esencia ámbar con notas cálidas y lujosas. Perfecta para ocasiones especiales y momentos únicos."],
    [13, "Fragancia Sublime",                          "100 ml",  36341.97, "Fragancias",      false, "🌸", "Fragancia sublime y delicada. Notas florales que envuelven con suavidad y elegancia incomparable."],
    [14, "Fragancia Millonaire",                       "100 ml",  57093.81, "Fragancias",      false, "🌸", "La fragancia más lujosa de la colección. Opulenta y exclusiva, para quienes buscan lo mejor."],
    [15, "Fragancia Kingdom",                          "100 ml",  36459.43, "Fragancias",      false, "🌸", "Majestuosa fragancia con carácter y personalidad. Ideal para quienes quieren dejar una huella memorable."],
    [16, "Fragancia Aquaman",                          "100 ml",  47108.35, "Fragancias",      false, "🌸", "Fragancia acuática y refrescante. Evoca la frescura del océano y la energía vibrante del mar."],
    [17, "Fragancia Fanning",                          "100 ml",  33665.10, "Fragancias",      false, "🌸", "Esencia ligera y versátil. Perfecta para el uso diario, fresca y discreta en cualquier ocasión."],
    [18, "Fragancia Pomelo & Granada",                 "100 ml",  29750,    "Fragancias",      false, "🌸", "Combinación frutal vibrante de pomelo y granada. Energizante y refrescante para cualquier momento."],
    [19, "Fragancia Perfume Marine",                   "100 ml",  29750,    "Fragancias",      false, "🌸", "Fragancia marina limpia y fresca. Notas acuáticas que evocan la brisa suave del mar abierto."],
    [20, "Fragancia Pastel Dream",                     "100 ml",  29750,    "Fragancias",      false, "🌸", "Dulce y soñadora. Notas pastel suaves que crean una sensación de delicadeza y romanticismo único."],
    [21, "Fragancia Shine Alight",                     "100 ml",  29750,    "Fragancias",      false, "🌸", "Fragancia luminosa y positiva. Como un rayo de sol, fresca y brillante para acompañarte todo el día."],
    [22, "Fragancia The Boss Perfume",                 "100 ml",  35700,    "Fragancias",      false, "🌸", "Para el verdadero líder. Fragancia poderosa, elegante y dominante con notas profundas e intensas."],
    [23, "Fragancia LG Silverhill",                    "100 ml",  29750,    "Fragancias",      false, "🌸", "Fragancia plateada y sofisticada. Fresca, limpia y con personalidad única para destacar."],
    [24, "Fragancia Platinum",                         "100 ml",  29750,    "Fragancias",      false, "🌸", "La pureza del platino en una fragancia. Elegante, suave y atemporal para cada día."],
    // Antibacteriales
    [25, "Gel Antibacterial Para Manos Galón",         "3.5 Kg",  35590.89, "Antibacteriales", false, "🤲", "Gel antibacterial de gran rendimiento. Elimina el 99.9% de gérmenes. Ideal para dispensadores de uso frecuente."],
    [26, "Gel Antibacterial Para Manos",               "500 gr",  7735,     "Antibacteriales", false, "🤲", "Gel antibacterial en presentación personal. Fórmula suave con el cutis y efectiva contra gérmenes."],
    [27, "Gel Antibacterial Para Manos",               "1000 gr", 14280,    "Antibacteriales", false, "🤲", "Presentación familiar de gel antibacterial. Cuida y protege tus manos de bacterias durante todo el día."],
    [28, "Jabón Antibacterial Para Manos Galón",       "4 Kg",    28560,    "Antibacteriales", false, "🧼", "Jabón líquido antibacterial en galón. Para dispensadores de uso intensivo en hogares, oficinas y comercios."],
    [29, "Jabón Antibacterial Para Manos",             "500 gr",  6584.27,  "Antibacteriales", false, "🧼", "Jabón antibacterial en presentación económica. Eficaz y suave para el higiene cotidiana de tus manos."],
    [30, "Jabón Antibacterial Para Manos",             "1000 gr", 11971.40, "Antibacteriales", false, "🧼", "Jabón líquido antibacterial familiar. Limpia profundamente y cuida la piel suave de tus manos."],
    // Lavaloza
    [31, "Lavaloza Líquido Galón",                     "4 Kg",    31953.28, "Lavaloza",        false, "🍽️", "Lavaloza líquido de alta concentración. Elimina la grasa de platos y utensilios con facilidad y aroma agradable."],
    [32, "Lavaloza Líquido Envase",                    "500 gr",  6000,     "Lavaloza",        false, "🍽️", "Presentación individual de lavaloza. Ideal para tu cocina diaria, deja platos y ollas brillantes."],
    [33, "Lavaloza Líquido Envase",                    "1000 gr", 10000,    "Lavaloza",        false, "🍽️", "Presentación de 1 Kg de lavaloza líquido. Excelente rendimiento para familias numerosas y uso frecuente."],
    // Limpiapisos
    [34, "Limpiapisos Encanto Tropical Envase",        "1 Kg",    9000,     "Limpiapisos",     true,  "🌿", "Limpiapisos con aroma tropical encantador. Limpia y desinfecta pisos duros dejando un olor fresco y duradero."],
    [35, "Limpiapisos Encanto Tropical Galón",         "4 Kg",    24370.43, "Limpiapisos",     false, "🌿", "Presentación galón del limpiapisos tropical. Rendimiento profesional para comercios y grandes espacios."],
    [36, "Limpiapisos Encanto Tropical Envase",        "500 gr",  6500,     "Limpiapisos",     true,  "🌿", "Presentación pequeña del limpiapisos tropical. Práctica y económica para el uso diario en el hogar."],
    [37, "Limpiapisos Encanto Tropical Envase",        "1000 gr", 11000,    "Limpiapisos",     true,  "🌿", "Tamaño familiar del limpiapisos con encanto tropical. Limpieza efectiva con aroma que perdura horas."],
    // Limpia Vidrios
    [38, "Limpia Vidrios Envase",                      "500 gr",  5500,     "Limpia Vidrios",  false, "🪟", "Limpiador de vidrios sin rayas ni residuos. Deja ventanas, espejos y superficies de vidrio completamente cristalinas."],
    [39, "Limpia Vidrios Envase",                      "1 Kg",    8000,     "Limpia Vidrios",  true,  "🪟", "Presentación de 1 Kg para limpieza de vidrios. Fórmula antivaho que brinda claridad total sin esfuerzo."],
    [40, "Limpia Vidrios Galón",                       "4 Kg",    27370,    "Limpia Vidrios",  false, "🪟", "Galón de limpiador para vidrios. Ideal para edificios, negocios o quienes necesitan gran volumen de limpieza."],
    // Otros
    [41, "Oxígeno Activo",                             "1 Kg",    12500,    "Otros",           true,  "💧", "Blanqueador y desinfectante de oxígeno activo. Sin cloro, cuida el color de las prendas y respeta el medio ambiente."],
    [42, "Suavizante Galón",                           "4 Kg",    21420,    "Otros",           false, "🌺", "Suavizante textil de larga duración. Deja la ropa suave, esponjosa y con un aroma fresco y agradable por días."],
    [43, "Suavizante Galón",                           "1000 gr", 10000,    "Otros",           false, "🌺", "Suavizante en 1 Kg. Ideal para el hogar, cuida las fibras y perfuma la ropa con una larga duración."],
    [44, "Suavizante Galón",                           "2000 gr", 17000,    "Otros",           true,  "🌺", "Suavizante de 2 Kg para familias. Excelente relación precio-rendimiento con fragancia duradera."],
  ];

  // Escribe todos los productos de una vez (más rápido que fila por fila)
  sheet.getRange(2, 1, productos.length, headers.length).setValues(productos);

  // Ajusta el ancho de las columnas automáticamente
  sheet.autoResizeColumns(1, headers.length);

  // Congela la primera fila (encabezados)
  sheet.setFrozenRows(1);

  // Formato de la columna "precio" como moneda COP
  sheet.getRange(2, 4, productos.length, 1).setNumberFormat("$ #,##0.00");

  Logger.log(`✅ ¡Listo! Se sincronizaron ${productos.length} productos en la hoja "Productos".`);
  SpreadsheetApp.getUi().alert(`✅ Sincronización completa\n\n${productos.length} productos han sido cargados en la hoja "Productos".\n\nDesde ahora puedes editar precios, nombres y descripciones directamente aquí.`);
}

/* ─────────────────────────────────────────────────────────────
   INICIALIZAR PESTAÑA DE PEDIDOS
   Ejecuta esta función UNA SOLA VEZ para crear y formatear
   la hoja "Pedidos" con sus encabezados.
───────────────────────────────────────────────────────────── */
function inicializarPedidos() {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName("Pedidos");

  if (!sheet) sheet = ss.insertSheet("Pedidos");

  // Limpia y recrea encabezados (para actualizar columnas si ya existía)
  sheet.clearContents();

  const headers = [
    "fecha",        // A
    "nombre",       // B
    "ciudad",       // C
    "departamento", // D
    "barrio",       // E
    "direccion",    // F
    "casa",         // G
    "conjunto",     // H
    "nota",         // I
    "medio_pago",   // J
    "zona_envio",   // K
    "costo_envio",  // L
    "subtotal",     // M
    "total",        // N
    "estado_pago",  // O  ← PENDIENTE / PAGADO / CONTRA ENTREGA / ENTREGADO
    "productos",    // P  ← Detalle completo, un producto por línea
  ];
  sheet.appendRow(headers);

  // Formato encabezados
  const hdrRange = sheet.getRange(1, 1, 1, headers.length);
  hdrRange.setFontWeight("bold");
  hdrRange.setBackground("#0D9488");
  hdrRange.setFontColor("#FFFFFF");
  hdrRange.setHorizontalAlignment("center");

  // Ancho fijo para columna de productos (más amplia)
  sheet.setColumnWidth(16, 400);  // columna P = productos
  sheet.setColumnWidth(15, 130);  // columna O = estado_pago
  sheet.setColumnWidth(1,  160);  // columna A = fecha
  sheet.getRange("L2:N1000").setNumberFormat("$ #,##0.00"); // costo_envio, subtotal, total
  sheet.getRange("P2:P1000").setWrap(true);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 14);

  Logger.log('✅ Hoja "Pedidos" lista con columnas nuevas.');
  SpreadsheetApp.getUi().alert(
    '✅ Hoja "Pedidos" configurada.\n\n' +
    'Columna M = ESTADO DE PAGO\n' +
    'Valores: PENDIENTE → PAGADO → ENTREGADO\n\n' +
    'Cámbiala manualmente cuando confirmes el pago.'
  );
}

/* ─────────────────────────────────────────────────────────────
   CONFIGURACIÓN INICIAL COMPLETA
   Ejecuta esta función para hacer TODO de una vez:
   crear Productos + crear Pedidos
───────────────────────────────────────────────────────────── */
function configuracionInicial() {
  populateProductos();
  inicializarPedidos();
  Logger.log("✅ Configuración inicial completa.");
}