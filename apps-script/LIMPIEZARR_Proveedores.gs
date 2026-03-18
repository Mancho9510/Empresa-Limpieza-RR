/**
 * LIMPIEZA RR - PROVEEDORES
 * Endpoints admin para proveedores y relacion con demanda de productos.
 */

function doGet_admin_proveedores(e) {
  try {
    const clave = e.parameter.clave || "";
    if (clave !== "LIMPIEZARR2025") {
      return jsonResponse({ ok: false, error: "No autorizado" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName("Proveedores");
    if (!pSheet || pSheet.getLastRow() < 2) {
      return jsonResponse({
        ok: true,
        proveedores: [],
        paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 },
        resumen: { total: 0, activos: 0, inactivos: 0, conDemanda: 0 },
      });
    }

    const data = pSheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const COL = {};
    headers.forEach((h, i) => COL[h] = i);

    const pagina = Math.max(1, parseInt(e.parameter.pagina || "1", 10));
    const porPagina = Math.min(100, Math.max(10, parseInt(e.parameter.por || "20", 10)));
    const busqueda = provNormalizeText(e.parameter.q || "");
    const activoRaw = String(e.parameter.activo || "").trim();
    const demanda = buildProviderDemandIndex(ss);

    const proveedores = data.slice(1)
      .map((row, idx) => mapAdminProveedor(row, idx + 2, COL, demanda))
      .filter(Boolean)
      .filter(proveedor => {
        if (busqueda) {
          const hayMatch = [
            proveedor.nombre,
            proveedor.contacto_nombre,
            proveedor.productos,
            proveedor.productos_top.map(item => item.nombre).join(" "),
          ].some(value => provNormalizeText(value).includes(busqueda));
          if (!hayMatch) return false;
        }

        if (activoRaw === "1" && !proveedor.activo) return false;
        if (activoRaw === "0" && proveedor.activo) return false;
        return true;
      });

    const total = proveedores.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio = (pagina - 1) * porPagina;
    const paginaProv = proveedores.slice(inicio, inicio + porPagina);

    return jsonResponse({
      ok: true,
      proveedores: paginaProv,
      paginacion: {
        pagina: pagina,
        porPagina: porPagina,
        total: total,
        totalPaginas: totalPaginas,
      },
      resumen: {
        total: total,
        activos: proveedores.filter(p => p.activo).length,
        inactivos: proveedores.filter(p => !p.activo).length,
        conDemanda: proveedores.filter(p => p.ventas_relacionadas > 0).length,
      },
    });
  } catch (err) {
    Logger.log("Error admin_proveedores: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost_admin_proveedores_upsert(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const clave = body.clave || "";
    if (clave !== "LIMPIEZARR2025") {
      return jsonResponse({ ok: false, error: "No autorizado" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let pSheet = ss.getSheetByName("Proveedores");
    if (!pSheet || pSheet.getLastColumn() === 0) {
      inicializarProveedores();
      pSheet = ss.getSheetByName("Proveedores");
    }
    if (!pSheet) return jsonResponse({ ok: false, error: "Hoja no encontrada" });

    const fila = body.fila;
    const nombre = body.nombre;
    const contacto_nombre = body.contacto_nombre;
    const telefono = body.telefono;
    const email = body.email;
    const productos = body.productos;
    const direccion = body.direccion;
    const nota = body.nota;
    const activo = body.activo;

    if (!nombre) {
      return jsonResponse({ ok: false, error: "Nombre del proveedor requerido" });
    }

    const fecha = new Date().toLocaleString("es-CO");
    const activoCell = activo !== false ? "Si" : "No";

    if (!fila || fila < 2) {
      appendRowByHeaders(pSheet, {
        nombre: nombre,
        contacto_nombre: contacto_nombre || "",
        telefono: telefono || "",
        email: email || "",
        productos: productos || "",
        direccion: direccion || "",
        nota: nota || "",
        fecha_registro: fecha,
        activo: activoCell,
      });
      return jsonResponse({ ok: true, mensaje: "Proveedor creado", fila: pSheet.getLastRow() });
    }

    updateRowByHeaders(pSheet, fila, {
      nombre: nombre,
      contacto_nombre: contacto_nombre || "",
      telefono: telefono || "",
      email: email || "",
      productos: productos || "",
      direccion: direccion || "",
      nota: nota || "",
      activo: activoCell,
    });
    return jsonResponse({ ok: true, mensaje: "Proveedor actualizado", fila: fila });
  } catch (err) {
    Logger.log("Error upsert proveedor: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost_admin_proveedores_eliminar(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const clave = body.clave || "";
    if (clave !== "LIMPIEZARR2025") {
      return jsonResponse({ ok: false, error: "No autorizado" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName("Proveedores");
    if (!pSheet) return jsonResponse({ ok: false, error: "Hoja no encontrada" });

    const fila = parseInt(body.fila, 10);
    if (!fila || fila < 2) {
      return jsonResponse({ ok: false, error: "Fila invalida" });
    }

    pSheet.deleteRow(fila);
    return jsonResponse({ ok: true, mensaje: "Proveedor eliminado" });
  } catch (err) {
    Logger.log("Error eliminar proveedor: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function mapAdminProveedor(row, fila, COL, demanda) {
  const nombre = String(getProvCell(row, COL, "nombre") || "").trim();
  if (!nombre) return null;

  const activo = isProveedorActivo(getProvCell(row, COL, "activo"));
  const catalogo = parseProviderCatalog(getProvCell(row, COL, "productos"));
  const resumen = summarizeProviderDemand(catalogo, demanda);

  return {
    fila: fila,
    nombre: nombre,
    contacto_nombre: String(getProvCell(row, COL, "contacto_nombre") || ""),
    telefono: String(getProvCell(row, COL, "telefono") || ""),
    email: String(getProvCell(row, COL, "email") || ""),
    productos: String(getProvCell(row, COL, "productos") || ""),
    direccion: String(getProvCell(row, COL, "direccion") || ""),
    nota: String(getProvCell(row, COL, "nota") || ""),
    fecha_registro: String(getProvCell(row, COL, "fecha_registro") || ""),
    activo: activo,
    activo_label: activo ? "Activo" : "Inactivo",
    badge_class: activo ? "bg-green-900/50 text-green-300" : "bg-slate-700/50 text-slate-300",
    catalogo_total: catalogo.length,
    catalogo_activo: resumen.catalogo_activo,
    ventas_relacionadas: resumen.ventas_relacionadas,
    ultima_venta_relacionada: resumen.ultima_venta_relacionada,
    productos_top: resumen.productos_top,
  };
}

function buildProviderDemandIndex(ss) {
  const pSheet = ss.getSheetByName("Pedidos");
  if (!pSheet || pSheet.getLastRow() < 2) return {};

  const data = pSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const fechaIdx = headers.indexOf("fecha");
  const prodIdx = headers.indexOf("productos");
  const demand = {};

  data.slice(1).forEach(row => {
    const fecha = String(row[fechaIdx] || "");
    parseProviderOrderProducts(row[prodIdx]).forEach(producto => {
      const key = provNormalizeText(producto.nombre);
      if (!key) return;

      if (!demand[key]) {
        demand[key] = {
          nombre: producto.nombre,
          unidades: 0,
          ultima_venta: "",
        };
      }

      demand[key].unidades += producto.cantidad;
      if (!demand[key].ultima_venta || provCompareDates(fecha, demand[key].ultima_venta) > 0) {
        demand[key].ultima_venta = fecha;
      }
    });
  });

  return demand;
}

function summarizeProviderDemand(catalogo, demanda) {
  const resumen = {
    catalogo_activo: 0,
    ventas_relacionadas: 0,
    ultima_venta_relacionada: "",
    productos_top: [],
  };

  const matched = [];
  const seen = {};

  catalogo.forEach(item => {
    const token = provNormalizeText(item);
    if (!token) return;

    Object.keys(demanda).forEach(key => {
      if (seen[token + "::" + key]) return;
      if (!providerCatalogMatches(token, key)) return;

      seen[token + "::" + key] = true;
      const dato = demanda[key];
      matched.push({ nombre: dato.nombre, unidades: dato.unidades, ultima_venta: dato.ultima_venta });
    });
  });

  matched.forEach(item => {
    resumen.catalogo_activo += 1;
    resumen.ventas_relacionadas += item.unidades;
    if (!resumen.ultima_venta_relacionada || provCompareDates(item.ultima_venta, resumen.ultima_venta_relacionada) > 0) {
      resumen.ultima_venta_relacionada = item.ultima_venta;
    }
  });

  resumen.productos_top = matched
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 3)
    .map(item => ({ nombre: item.nombre, unidades: item.unidades }));

  return resumen;
}

function parseProviderCatalog(texto) {
  return String(texto || "")
    .split(/[\n,;]+/)
    .map(item => String(item || "").trim())
    .filter(Boolean);
}

function parseProviderOrderProducts(productosStr) {
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

function providerCatalogMatches(token, demandKey) {
  if (!token || !demandKey) return false;
  if (token === demandKey) return true;
  if (token.length >= 4 && demandKey.includes(token)) return true;
  if (demandKey.length >= 4 && token.includes(demandKey)) return true;
  return false;
}

function isProveedorActivo(value) {
  const txt = provNormalizeText(value);
  return txt === "si" || txt === "s" || txt === "true" || txt === "1";
}

function getProvCell(row, COL, key) {
  return COL[key] !== undefined ? row[COL[key]] : "";
}

function provNormalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function provCompareDates(a, b) {
  const fa = parseLimpiezaDate(a);
  const fb = parseLimpiezaDate(b);
  const ta = !fa || isNaN(fa.getTime()) ? 0 : fa.getTime();
  const tb = !fb || isNaN(fb.getTime()) ? 0 : fb.getTime();
  return ta - tb;
}
