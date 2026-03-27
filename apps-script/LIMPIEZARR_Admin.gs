/**
 * LIMPIEZA RR - CLIENTES
 * Endpoints admin para consultar, crear, editar y eliminar clientes.
 */

function doGet_admin_clientes(e) {
  try {
    const clave = e.parameter.clave || "";
    if (!verificarClave(clave)) {
      return jsonResponse({ ok: false, error: "No autorizado" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cSheet = ss.getSheetByName("Clientes");
    if (!cSheet || cSheet.getLastRow() < 2) {
      return jsonResponse({
        ok: true,
        clientes: [],
        paginacion: { pagina: 1, porPagina: 25, total: 0, totalPaginas: 0 },
        resumen: { total: 0, nuevos: 0, recurrentes: 0, vip: 0, dormidos: 0 },
        filtros_disponibles: { tipos: [], segmentos: [] },
      });
    }

    const cData = cSheet.getDataRange().getValues();
    const cHdr = cData[0].map(h => String(h).toLowerCase().trim());
    const COL = {};
    cHdr.forEach((h, i) => COL[h] = i);

    const pagina = Math.max(1, parseInt(e.parameter.pagina || "1", 10));
    const porPagina = Math.min(100, Math.max(10, parseInt(e.parameter.por || "25", 10)));
    const busqueda = normalizeText(e.parameter.q || "");
    const tipoFiltro = normalizeText(e.parameter.tipo || "");
    const segmentoFiltro = normalizeText(e.parameter.segmento || "");
    const pedidosPorTelefono = buildClientOrdersIndex(ss);

    const clientes = cData.slice(1)
      .map((row, idx) => mapAdminCliente(row, idx + 2, COL, pedidosPorTelefono))
      .filter(Boolean)
      .filter(cliente => {
        if (busqueda) {
          const hayMatch = [
            cliente.nombre,
            cliente.telefono,
            cliente.ciudad,
            cliente.barrio,
            cliente.segmento_retencion,
            cliente.productos_favoritos,
          ].some(value => normalizeText(value).includes(busqueda));
          if (!hayMatch) return false;
        }

        if (tipoFiltro && !normalizeText(cliente.tipo).includes(tipoFiltro)) return false;
        if (segmentoFiltro && !normalizeText(cliente.segmento_retencion).includes(segmentoFiltro)) return false;
        return true;
      });

    const total = clientes.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (pagina - 1) * porPagina;
    const paginaClientes = clientes.slice(inicio, inicio + porPagina);

    return jsonResponse({
      ok: true,
      clientes: paginaClientes,
      paginacion: {
        pagina: pagina,
        porPagina: porPagina,
        total: total,
        totalPaginas: totalPaginas,
      },
      resumen: {
        total: total,
        nuevos: clientes.filter(c => normalizeText(c.tipo).includes("nuevo")).length,
        recurrentes: clientes.filter(c => normalizeText(c.tipo).includes("recurrente")).length,
        vip: clientes.filter(c => normalizeText(c.tipo).includes("vip")).length,
        dormidos: clientes.filter(c => normalizeText(c.segmento_retencion).includes("dormido")).length,
      },
      filtros_disponibles: {
        tipos: uniqueSorted(clientes.map(c => c.tipo)),
        segmentos: uniqueSorted(clientes.map(c => c.segmento_retencion)),
      },
    });
  } catch (err) {
    Logger.log("Error admin_clientes: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost_admin_clientes_upsert(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const clave = body.clave || "";
    if (!verificarClave(clave))
     {
      return jsonResponse({ ok: false, error: "No autorizado" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let cSheet = ss.getSheetByName("Clientes");
    if (!cSheet || cSheet.getLastColumn() === 0) {
      inicializarClientes();
      cSheet = ss.getSheetByName("Clientes");
    }
    if (!cSheet) return jsonResponse({ ok: false, error: "Hoja Clientes no encontrada" });

    const nombre = body.nombre;
    const telefono = body.telefono;
    const ciudad = body.ciudad;
    const barrio = body.barrio;
    const direccion = body.direccion;

    if (!nombre || !telefono) {
      return jsonResponse({ ok: false, error: "Nombre y telefono requeridos" });
    }

    const telNorm = normalizePhone(telefono);
    let rowNum = -1;
    const data = cSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const telRow = normalizePhone(data[i][3]);
      if (telRow === telNorm) {
        rowNum = i + 1;
        break;
      }
    }

    const fecha = new Date().toLocaleString("es-CO");

    if (rowNum === -1) {
      appendRowByHeaders(cSheet, {
        primera_compra: fecha,
        ultima_compra: fecha,
        nombre: nombre,
        telefono: telNorm,
        ciudad: ciudad || "",
        barrio: barrio || "",
        direccion: direccion || "",
        total_pedidos: 0,
        total_gastado: 0,
        tipo: "Nuevo",
      });
      return jsonResponse({ ok: true, mensaje: "Cliente creado", fila: cSheet.getLastRow() });
    }

    updateRowByHeaders(cSheet, rowNum, {
      nombre: nombre,
      telefono: telNorm,
      ciudad: ciudad || "",
      barrio: barrio || "",
      direccion: direccion || "",
    });
    return jsonResponse({ ok: true, mensaje: "Cliente actualizado", fila: rowNum });
  } catch (err) {
    Logger.log("Error admin_clientes_upsert: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost_admin_clientes_eliminar(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const clave = body.clave || "";
    if (!verificarClave(clave)) {
      return jsonResponse({ ok: false, error: "No autorizado" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cSheet = ss.getSheetByName("Clientes");
    if (!cSheet) return jsonResponse({ ok: false, error: "Hoja no encontrada" });

    const fila = parseInt(body.fila, 10);
    if (!fila || fila < 2) {
      return jsonResponse({ ok: false, error: "Fila invalida" });
    }

    cSheet.deleteRow(fila);
    return jsonResponse({ ok: true, mensaje: "Cliente eliminado" });
  } catch (err) {
    Logger.log("Error eliminar cliente: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function mapAdminCliente(row, fila, COL, pedidosPorTelefono) {
  const telefono = normalizePhone(getCell(row, COL, "telefono"));
  const nombre = String(getCell(row, COL, "nombre") || "").trim();
  if (!telefono && !nombre) return null;

  const resumenPedido = pedidosPorTelefono[telefono] || emptyClientSummary();
  const primeraCompra = String(getCell(row, COL, "primera_compra") || resumenPedido.primera_compra || "");
  const ultimaCompra = String(getCell(row, COL, "ultima_compra") || resumenPedido.ultima_compra || "");
  const totalPedidos = Number(getCell(row, COL, "total_pedidos") || resumenPedido.total_pedidos || 0);
  const totalGastado = Number(getCell(row, COL, "total_gastado") || resumenPedido.total_gastado || 0);
  const tipo = String(getCell(row, COL, "tipo") || classifyClient(totalPedidos, totalGastado));
  const diasSinCompra = daysSince(ultimaCompra);
  const segmento = retentionSegment(totalPedidos, diasSinCompra);

  return {
    fila: fila,
    nombre: nombre || ("Cliente " + telefono),
    telefono: String(getCell(row, COL, "telefono") || ""),
    ciudad: String(getCell(row, COL, "ciudad") || ""),
    barrio: String(getCell(row, COL, "barrio") || ""),
    direccion: String(getCell(row, COL, "direccion") || ""),
    primera_compra: primeraCompra,
    ultima_compra: ultimaCompra,
    total_pedidos: totalPedidos,
    total_gastado: totalGastado,
    tipo: tipo,
    frecuencia: purchaseFrequency(primeraCompra, ultimaCompra, totalPedidos),
    dias_sin_compra: diasSinCompra,
    segmento_retencion: segmento,
    badge_class: typeBadgeClass(tipo),
    segmento_class: segmentBadgeClass(segmento),
    top_productos: resumenPedido.top_productos,
    ultimos_pedidos: resumenPedido.ultimos_pedidos,
    productos_favoritos: resumenPedido.top_productos.map(p => p.nombre).join(", "),
  };
}

function buildClientOrdersIndex(ss) {
  const pSheet = ss.getSheetByName("Pedidos");
  if (!pSheet || pSheet.getLastRow() < 2) return {};

  const pData = pSheet.getDataRange().getValues();
  const pHdr = pData[0].map(h => String(h).toLowerCase().trim());
  const telIdx = pHdr.indexOf("telefono");
  const fechaIdx = pHdr.indexOf("fecha");
  const totalIdx = pHdr.indexOf("total");
  const pagoIdx = pHdr.indexOf("estado_pago");
  const prodIdx = pHdr.indexOf("productos");
  const index = {};

  pData.slice(1).forEach(row => {
    const telefono = normalizePhone(row[telIdx]);
    if (!telefono) return;

    if (!index[telefono]) index[telefono] = emptyClientSummary();
    const bucket = index[telefono];
    const fecha = String(row[fechaIdx] || "");
    let total = Number(row[totalIdx] || 0);
    if ((!total || isNaN(total)) && pHdr.indexOf("subtotal") >= 0) {
      total = Number(row[pHdr.indexOf("subtotal")] || 0);
    }
    const productos = parseOrderProducts(row[prodIdx]);

    bucket.total_pedidos += 1;
    bucket.total_gastado += total;

    if (!bucket.primera_compra || compareDateStrings(fecha, bucket.primera_compra) < 0) {
      bucket.primera_compra = fecha;
    }
    if (!bucket.ultima_compra || compareDateStrings(fecha, bucket.ultima_compra) > 0) {
      bucket.ultima_compra = fecha;
    }

    bucket.ultimos_pedidos.push({
      fecha: fecha,
      total: total,
      estado_pago: String(row[pagoIdx] || ""),
      productos: productos.slice(0, 3).map(p => p.nombre).join(", "),
    });

    productos.forEach(producto => {
      bucket.productos_count[producto.nombre] = (bucket.productos_count[producto.nombre] || 0) + producto.cantidad;
    });
  });

  Object.keys(index).forEach(key => {
    const bucket = index[key];
    bucket.ultimos_pedidos = bucket.ultimos_pedidos
      .sort((a, b) => compareDateStrings(b.fecha, a.fecha))
      .slice(0, 3);

    bucket.top_productos = Object.keys(bucket.productos_count)
      .sort((a, b) => bucket.productos_count[b] - bucket.productos_count[a])
      .slice(0, 3)
      .map(nombre => ({ nombre: nombre, veces: bucket.productos_count[nombre] }));

    delete bucket.productos_count;
  });

  return index;
}

function emptyClientSummary() {
  return {
    primera_compra: "",
    ultima_compra: "",
    total_pedidos: 0,
    total_gastado: 0,
    ultimos_pedidos: [],
    top_productos: [],
    productos_count: {},
  };
}

function parseOrderProducts(productosStr) {
  return String(productosStr || "")
    .split("\n")
    .map(linea => {
      const limpia = String(linea || "").trim();
      if (!limpia) return null;
      const nombre = limpia.split("|")[0].trim();
      const qtyMatch = limpia.match(/Cant[^0-9]*([0-9]+)/i);
      return {
        nombre: nombre,
        cantidad: qtyMatch ? Number(qtyMatch[1]) || 1 : 1,
      };
    })
    .filter(item => item && item.nombre);
}

function purchaseFrequency(primera, ultima, totalPedidos) {
  try {
    const inicio = parseLimpiezaDate(primera);
    const fin = parseLimpiezaDate(ultima);
    if (totalPedidos <= 1) return "Primer pedido";
    if (!inicio || !fin || isNaN(inicio.getTime()) || isNaN(fin.getTime())) return "Esporadica";

    const dias = Math.max(0, (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    if (dias <= 30) return "Alta";
    if (dias <= 90) return "Media";
    if (dias <= 180) return "Baja";
    return "Muy baja";
  } catch (e) {
    return "Desconocida";
  }
}

function retentionSegment(totalPedidos, diasSinCompra) {
  if (!totalPedidos) return "Sin compras";
  if (totalPedidos <= 1) return diasSinCompra !== null && diasSinCompra > 45 ? "Nuevo sin retorno" : "Nuevo";
  if (diasSinCompra === null) return "Recurrente";
  if (diasSinCompra <= 30) return "Recurrente activo";
  if (diasSinCompra <= 90) return "En riesgo";
  return "Dormido";
}

function classifyClient(totalPedidos, totalGastado) {
  if (totalPedidos >= 10 || totalGastado >= 500000) return "VIP";
  if (totalPedidos >= 2 || totalGastado >= 150000) return "Recurrente";
  return "Nuevo";
}

function daysSince(fechaTexto) {
  const fecha = parseLimpiezaDate(fechaTexto);
  if (!fecha || isNaN(fecha.getTime())) return null;
  return Math.max(0, Math.floor((new Date().getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)));
}

function compareDateStrings(a, b) {
  const fa = parseLimpiezaDate(a);
  const fb = parseLimpiezaDate(b);
  const ta = !fa || isNaN(fa.getTime()) ? 0 : fa.getTime();
  const tb = !fb || isNaN(fb.getTime()) ? 0 : fb.getTime();
  return ta - tb;
}

function typeBadgeClass(tipo) {
  const valor = normalizeText(tipo);
  if (valor.includes("vip")) return "bg-yellow-900/50 text-yellow-300";
  if (valor.includes("recurrente")) return "bg-green-900/50 text-green-300";
  return "bg-blue-900/50 text-blue-300";
}

function segmentBadgeClass(segmento) {
  const valor = normalizeText(segmento);
  if (valor.includes("dormido")) return "bg-red-900/40 text-red-300";
  if (valor.includes("riesgo")) return "bg-yellow-900/40 text-yellow-300";
  if (valor.includes("activo")) return "bg-green-900/40 text-green-300";
  return "bg-slate-700/50 text-slate-300";
}

function getCell(row, COL, key) {
  return COL[key] !== undefined ? row[COL[key]] : "";
}

function normalizePhone(value) {
  let tel = String(value || "").replace(/\D/g, "");
  if (tel.length === 12 && tel.startsWith("57")) {
    tel = tel.slice(2);
  }
  return tel;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function uniqueSorted(values) {
  return Array.from(new Set((values || []).filter(Boolean))).sort();
}