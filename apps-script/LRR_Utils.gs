/* ═══════════════════════════════════════════════════════════
   LIMPIEZA RR — Utilidades Centralizadas v4
   LIMPIEZARR_Utils.gs

   Contiene:
   A. calcGanancia()        — fórmula única de rentabilidad
   B. aplicarColorStock()   — colores batch-ready para stock
   C. aplicarColorPago()    — colores para estado de pago
   D. logError()            — logging estructurado a hoja Log
   E. getAdminKey()         — clave desde PropertiesService (seguro)
   F. parseProductosLinea() — parser centralizado del campo productos

   REGLA: si necesitas calcular ganancia, formatear un color de
   stock/pago, o escribir un log, importa desde aquí.
   No dupliques la lógica en ningún otro archivo.
═══════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────
   A. GANANCIA — única fuente de verdad
   
   Markup sobre costo: ((precio - costo) / costo) × 100
   Consistente con la calculadora de precios y el Sheet.
   
   Devuelve: { pct: number|null, pesos: number|null }
────────────────────────────────────────────────────────────── */
function calcGanancia(precio, costo) {
  var p = Number(precio) || 0;
  var c = Number(costo)  || 0;
  if (p <= 0 || c <= 0) return { pct: null, pesos: null };
  return {
    pct:   Math.round(((p - c) / c) * 100 * 10) / 10,   // ej: 66.7
    pesos: p - c,                                         // ej: 4000
  };
}

/* ──────────────────────────────────────────────────────────────
   B. COLOR DE STOCK — aplica formato a una celda de Sheets
   
   Uso: aplicarColorStock(sheet.getRange(fila, col), nuevoStock)
   
   Devuelve el objeto Range para encadenamiento opcional.
────────────────────────────────────────────────────────────── */
function aplicarColorStock(cell, stock) {
  if (stock === "" || stock === null || stock === undefined) {
    cell.setBackground("#FFFFFF").setFontColor("#0F172A").setFontWeight("normal");
  } else if (Number(stock) === 0) {
    cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  } else if (Number(stock) <= 5) {
    cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
  } else {
    cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("normal");
  }
  return cell;
}

/* ──────────────────────────────────────────────────────────────
   C. COLOR DE PAGO — aplica formato a celda estado_pago
────────────────────────────────────────────────────────────── */
function aplicarColorPago(cell, estadoPago) {
  var val = String(estadoPago || "").toUpperCase();
  if (val === "PAGADO")              cell.setBackground("#DCFCE7").setFontColor("#166534").setFontWeight("bold");
  else if (val === "CONTRA ENTREGA") cell.setBackground("#FEF9C3").setFontColor("#854D0E").setFontWeight("bold");
  else                               cell.setBackground("#FEE2E2").setFontColor("#991B1B").setFontWeight("bold");
  return cell;
}

/* ──────────────────────────────────────────────────────────────
   D. LOGGING ESTRUCTURADO
   
   Escribe en la hoja "Log" (la crea si no existe).
   Solo registra errores reales — no debug verboso.
   
   Uso: logError("descontarStock", err, { productos: body.productos });
   Uso: logError("doPost", err);
────────────────────────────────────────────────────────────── */
function logError(accion, error, datos) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Log");
    if (!sheet) {
      sheet = ss.insertSheet("Log");
      sheet.appendRow(["fecha", "nivel", "accion", "mensaje", "datos"]);
      sheet.getRange(1, 1, 1, 5)
        .setFontWeight("bold").setBackground("#EF4444").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
    var mensaje = (error instanceof Error) ? error.message : String(error || "");
    var datosStr = datos ? JSON.stringify(datos).slice(0, 500) : "";
    sheet.appendRow([
      Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy HH:mm:ss"),
      "ERROR",
      accion,
      mensaje,
      datosStr,
    ]);
  } catch(logErr) {
    // Nunca fallar dentro del logger
    Logger.log("logError falló: " + logErr.message);
  }
}

function logInfo(accion, mensaje) {
  // Versión ligera para eventos importantes (pedido nuevo, etc.)
  // Solo escribe si la hoja Log ya existe — no la crea.
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Log");
    if (!sheet) return;
    sheet.appendRow([
      Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy HH:mm:ss"),
      "INFO",
      accion,
      mensaje,
      "",
    ]);
  } catch(e) {}
}

/* ──────────────────────────────────────────────────────────────
   E. ADMIN KEY SEGURA — PropertiesService
   
   Cómo configurar:
     En Apps Script: Archivo → Propiedades del proyecto → Script Properties
     Agregar:  Clave = ADMIN_KEY   Valor = tu_clave_secreta
   
   NO hay fallback hardcodeado. Si no está configurada, lanza error.
────────────────────────────────────────────────────────────── */
function getAdminKey() {
  try {
    var stored = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
    if (stored && stored.trim()) return stored.trim();
  } catch(e) {
    logError("getAdminKey", e);
  }
  // Sin fallback — forzar configuración correcta
  throw new Error("ADMIN_KEY no configurada en PropertiesService. Ve a Archivo → Propiedades del proyecto → Script Properties y agrega ADMIN_KEY.");
}

function validarClave(clave) {
  return clave === getAdminKey();
}

// Alias para compatibilidad — el código existente (Setup, Admin, Formato) usa "verificarClave"
function verificarClave(clave) {
  return validarClave(clave);
}

/* ──────────────────────────────────────────────────────────────
   F. PARSER CENTRALIZADO DE PRODUCTOS EN PEDIDOS
   
   Lee una línea del campo "productos" de la hoja Pedidos.
   Formato actual: "Limpiapisos 1 Kg | Cant: 2 | P.Unit: $ 9.000 | Subtotal: $ 18.000"
   
   Devuelve: { nombre: string, cantidad: number }
   O null si la línea no tiene una cantidad válida.
   
   Nota: cuando se implemente productos_json, este parser
   se puede reemplazar sin tocar el resto del backend.
────────────────────────────────────────────────────────────── */
function parsearLineaProducto(linea) {
  var limpia = String(linea || "").trim();
  if (!limpia) return null;
  var cantMatch = limpia.match(/Cant[^0-9]*([0-9]+)/i);
  if (!cantMatch) return null;
  return {
    nombre:   limpia.split("|")[0].trim().toLowerCase(),
    cantidad: parseInt(cantMatch[1], 10) || 1,
  };
}

function parsearProductosPedido(productosStr, productosJsonStr) {
  // Preferir JSON estructurado si está disponible — más fiable que el parsing de texto
  if (productosJsonStr) {
    try {
      var arr = JSON.parse(productosJsonStr);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map(function(item) {
          return {
            nombre:   String((item.nombre || "") + " " + (item.tamano || "")).trim().toLowerCase(),
            cantidad: Number(item.cantidad) || 1,
            id:       item.id || null,
            precio:   Number(item.precio) || 0,
          };
        }).filter(function(item) { return item.nombre; });
      }
    } catch(e) {
      // JSON malformado → fallback al texto
      Logger.log("parsearProductosPedido: JSON inválido, usando texto");
    }
  }
  // Fallback: parsing de texto (pedidos históricos sin productos_json)
  return String(productosStr || "")
    .split("\n")
    .map(parsearLineaProducto)
    .filter(Boolean);
}

/* ──────────────────────────────────────────────────────────────
   G. BATCH COLOR STOCK — aplica colores a múltiples celdas a la vez
   
   Recibe un array de { fila, col, stock } y hace UNA llamada
   setValues + una por cada grupo de color (máximo 4 grupos).
   
   Mucho más eficiente que setValue/setBackground por celda.
   
   Uso:
     var cambios = [{ fila: 5, stock: 0 }, { fila: 7, stock: 3 }];
     batchColorStock(sheet, stkCol, cambios);
────────────────────────────────────────────────────────────── */
function batchColorStock(sheet, stkCol, cambios) {
  if (!cambios || cambios.length === 0) return;

  // Agrupar por color para minimizar llamadas a la API
  var agotados = [], bajos = [], ok = [], sinControl = [];

  cambios.forEach(function(c) {
    var val = c.stock;
    if (val === "" || val === null || val === undefined) {
      sinControl.push(c.fila);
    } else if (Number(val) === 0) {
      agotados.push(c.fila);
    } else if (Number(val) <= 5) {
      bajos.push(c.fila);
    } else {
      ok.push(c.fila);
    }
  });

  function colorGroup(filas, bg, fg, fw) {
    filas.forEach(function(fila) {
      var cell = sheet.getRange(fila, stkCol);
      cell.setBackground(bg).setFontColor(fg).setFontWeight(fw);
    });
  }

  if (agotados.length)   colorGroup(agotados,   "#FEE2E2", "#991B1B", "bold");
  if (bajos.length)      colorGroup(bajos,       "#FEF9C3", "#854D0E", "bold");
  if (ok.length)         colorGroup(ok,          "#DCFCE7", "#166534", "normal");
  if (sinControl.length) colorGroup(sinControl,  "#FFFFFF", "#0F172A", "normal");
}

/* ──────────────────────────────────────────────────────────────
   H. RECONCILIACIÓN DE STOCK
   
   Recalcula el stock de todos los productos sumando las
   ventas registradas en Pedidos y restándolas del stock inicial.
   
   Útil cuando hay inconsistencias por errores anteriores.
   Solo ejecutar manualmente desde el editor.
────────────────────────────────────────────────────────────── */
function recalcularStockDesdePedidos() {
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var prodSheet = ss.getSheetByName("Productos");
  var pedSheet  = ss.getSheetByName("Pedidos");

  if (!prodSheet || !pedSheet) {
    Logger.log("ERROR: Falta hoja Productos o Pedidos");
    return;
  }

  // Construir mapa de ventas por producto
  var _ped = leerSheet(ss, "Pedidos");
  if (!_ped.sheet) { Logger.log("ERROR: Hoja Pedidos no encontrada"); return; }
  var pedPC   = {}; _ped.headers.forEach(function(h,i){ pedPC[h]=i; });

  var ventasPorProducto = {};
  _ped.rows.forEach(function(r) {
    parsearProductosPedido(r[pedPC["productos"]]).forEach(function(item) {
      ventasPorProducto[item.nombre] = (ventasPorProducto[item.nombre] || 0) + item.cantidad;
    });
  });

  // Generar reporte — NO modifica el stock automáticamente
  var _prod = leerSheet(ss, "Productos");
  if (!_prod.sheet) { Logger.log("ERROR: Hoja Productos no encontrada"); return; }
  var pPC      = {}; _prod.headers.forEach(function(h,i){ pPC[h]=i; });

  var reporte = ["Producto | Stock actual | Ventas registradas | Diferencia"];
  _prod.rows.forEach(function(r) {
    var nombre   = String(r[pPC["nombre"]]||"").trim();
    var tamano   = String(r[pPC["tamano"]]||"").trim();
    var key      = (nombre + " " + tamano).toLowerCase();
    var stock    = r[pPC["stock"]];
    var ventas   = ventasPorProducto[key] || 0;
    if (ventas > 0) {
      reporte.push([nombre, tamano, stock, ventas].join(" | "));
    }
  });

  Logger.log(reporte.join("\n"));
  Logger.log("Ejecutado en: " + Utilities.formatDate(new Date(), "America/Bogota", "dd/MM/yyyy HH:mm"));
}

/* ══════════════════════════════════════════════════════════════
   I. VALIDACIÓN DE PEDIDO — punto de entrada único
   
   Lanza Error con campo específico si falta algo.
   Se llama ANTES de guardar nada.
   
   Uso: validarBodyPedido(body); // lanza si algo falla
══════════════════════════════════════════════════════════════ */
function validarBodyPedido(body) {
  // Campos de texto obligatorios
  var requeridos = [
    { campo: "nombre",    etiqueta: "Nombre completo" },
    { campo: "telefono",  etiqueta: "Teléfono" },
    { campo: "ciudad",    etiqueta: "Ciudad" },
    { campo: "barrio",    etiqueta: "Barrio" },
    { campo: "direccion", etiqueta: "Dirección" },
    { campo: "pago",      etiqueta: "Método de pago" },
  ];

  requeridos.forEach(function(r) {
    var val = String(body[r.campo] || "").trim();
    if (!val) throw new Error(r.etiqueta + " es requerido");
  });

  // Teléfono: solo dígitos, mínimo 7
  var tel = String(body.telefono || "").replace(/\D/g, "");
  if (tel.length < 7) throw new Error("Teléfono inválido (" + tel.length + " dígitos)");

  // Total: número >= 0
  // Acepta 0 cuando es "a convenir" (zona sin precio fijo)
  // Acepta el string "A convenir" de versiones anteriores del frontend (compatibilidad)
  var totalRaw = body.total;
  if (totalRaw !== "A convenir") {
    var total = Number(totalRaw);
    if (isNaN(total) || total < 0) throw new Error("Total inválido: " + totalRaw);
  }

  // Productos: debe existir y tener al menos una línea válida
  var prods = String(body.productos || "").trim();
  if (!prods) throw new Error("El pedido no tiene productos");

  var lineas = parsearProductosPedido(prods);
  if (lineas.length === 0) throw new Error("No se pudo leer ningún producto del pedido");
}

/* ══════════════════════════════════════════════════════════════
   J. LEER SHEET EFICIENTE — solo las filas con datos
   
   Reemplaza getDataRange().getValues() en hojas que crecen.
   Devuelve { headers, rows, lastRow } — misma interfaz.
   
   Uso: var s = leerSheet(ss, "Pedidos");
        s.rows.forEach(r => { ... s.headers ... })
══════════════════════════════════════════════════════════════ */
function leerSheet(ss, nombreHoja) {
  var sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) return { sheet: null, headers: [], rows: [], lastRow: 0 };

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol === 0) {
    var hdr = lastRow >= 1
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      : [];
    return { sheet: sheet, headers: hdr, rows: [], lastRow: lastRow };
  }

  // Leer solo las filas con datos (sin filas vacías del final)
  var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allData[0].map(function(h) { return String(h).toLowerCase().trim(); });

  // Filtrar filas completamente vacías (en lugar de solo la primera columna)
  var rows = allData.slice(1).filter(function(r) {
    for (var j = 0; j < r.length; j++) {
      if (r[j] !== "" && r[j] !== null && r[j] !== undefined) return true;
    }
    return false;
  });

  return { sheet: sheet, headers: headers, rows: rows, lastRow: lastRow };
}

/* ══════════════════════════════════════════════════════════════
   K. CACHE HELPERS — TTL configurable por endpoint
   
   Envuelve CacheService con manejo de errores y serialización.
   
   Uso:
     var cached = cacheGet("admin_productos_v1");
     if (cached) return jsonResponse(cached);
     // ... calcular ...
     cachePut("admin_productos_v1", resultado, 600); // 10 min
══════════════════════════════════════════════════════════════ */
function cacheGet(key) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) {
    return null;
  }
}

function cachePut(key, data, ttlSegundos) {
  try {
    var str = JSON.stringify(data);
    // CacheService tiene límite de 100KB por entrada
    if (str.length > 95000) return false;
    CacheService.getScriptCache().put(key, str, ttlSegundos || 300);
    return true;
  } catch(e) {
    return false;
  }
}

function cacheDelete(key) {
  try { CacheService.getScriptCache().remove(key); } catch(e) {}
}

// Invalida todos los caches del sistema (usar cuando hay cambio crítico)
function invalidarTodosLosCaches() {
  var keys = [
    "admin_dashboard_v1",
    "admin_productos_v1",
    "admin_rentabilidad_v1",
  ];
  keys.forEach(cacheDelete);
  Logger.log("Todos los caches invalidados");
}

/* ──────────────────────────────────────────────────────────────
   L. HELPERS GLOBALES MOVIDOS DE SETUP
────────────────────────────────────────────────────────────── */

function getSS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No hay spreadsheet activo.");
  return ss;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeDriveUrl(url) {
  if (!url || String(url).trim() === "") return "";
  var matchFile = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return "https://drive.google.com/uc?export=view&id=" + matchFile[1];
  var matchOpen = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpen) return "https://drive.google.com/uc?export=view&id=" + matchOpen[1];
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