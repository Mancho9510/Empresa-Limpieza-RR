(function() {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtMoney(value) {
    return "$ " + Math.round(Number(value || 0)).toLocaleString("es-CO");
  }

  function claseTipoCliente(tipo) {
    const key = String(tipo || "").toLowerCase();
    if (key.includes("vip")) return "bg-yellow-900/50 text-yellow-300 border border-yellow-600/40";
    if (key.includes("recurrente")) return "bg-green-900/50 text-green-300 border border-green-600/40";
    return "bg-blue-900/50 text-blue-300 border border-blue-600/40";
  }

  function claseRecencia(estado) {
    const key = String(estado || "").toLowerCase();
    if (key.includes("activo")) return "bg-teal-900/40 text-teal-300 border border-teal-600/40";
    if (key.includes("recurrente")) return "bg-green-900/40 text-green-300 border border-green-600/40";
    if (key.includes("nuevo")) return "bg-blue-900/40 text-blue-300 border border-blue-600/40";
    if (key.includes("riesgo")) return "bg-yellow-900/40 text-yellow-300 border border-yellow-600/40";
    return "bg-slate-700/60 text-slate-300 border border-slate-600/40";
  }

  function claseEstadoProveedor(estado) {
    const key = String(estado || "").toLowerCase();
    if (key.includes("movimiento")) return "bg-teal-900/40 text-teal-300 border border-teal-600/40";
    if (key.includes("inactivo")) return "bg-slate-700/60 text-slate-300 border border-slate-600/40";
    return "bg-yellow-900/40 text-yellow-300 border border-yellow-600/40";
  }

  function renderProductosTop(items, emptyLabel) {
    if (!items || !items.length) {
      return `<div class="text-xs text-slate-500">${escapeHtml(emptyLabel)}</div>`;
    }
    return items.map(item => {
      const nombre = escapeHtml(item.nombre || item.producto || "");
      const veces = Number(item.veces || item.cant || 0);
      return `
        <div class="flex items-center justify-between gap-3 text-xs">
          <span class="text-slate-300 truncate">${nombre}</span>
          <span class="text-teal-300 font-bold flex-shrink-0">${veces}x</span>
        </div>`;
    }).join("");
  }

  function renderUltimosPedidos(items) {
    if (!items || !items.length) {
      return '<div class="text-xs text-slate-500">Sin compras recientes</div>';
    }
    return items.map(item => `
      <div class="rounded-lg bg-slate-900/60 border border-slate-700/60 px-3 py-2">
        <div class="flex items-center justify-between gap-3 text-xs">
          <span class="text-slate-400">${escapeHtml(item.fecha || "")}</span>
          <span class="text-teal-300 font-bold">${fmtMoney(item.total || 0)}</span>
        </div>
        <div class="text-xs text-slate-300 mt-1">${escapeHtml(item.productos_resumen || item.productos || "")}</div>
      </div>`).join("");
  }

  function renderClienteCard(cliente) {
    const ubicacion = [cliente.ciudad, cliente.barrio].filter(Boolean).join(" - ") || "Sin ubicacion";
    return `
      <article class="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4 animate-fade-up">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold text-white truncate">${escapeHtml(cliente.nombre)}</div>
            <div class="text-xs text-slate-400 mt-1">${escapeHtml(cliente.telefono || "Sin telefono")}</div>
            <div class="text-xs text-slate-500 mt-1">${escapeHtml(ubicacion)}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-sm font-display font-bold text-teal-300">${fmtMoney(cliente.total_gastado)}</div>
            <div class="text-xs text-slate-500">${Number(cliente.total_pedidos || 0)} pedidos</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="text-xs rounded-full px-2.5 py-1 font-bold ${claseTipoCliente(cliente.tipo)}">${escapeHtml(cliente.tipo || "Sin tipo")}</span>
          <span class="text-xs rounded-full px-2.5 py-1 font-bold ${claseRecencia(cliente.segmento_retencion)}">${escapeHtml(cliente.segmento_retencion || "Sin estado")}</span>
          <span class="text-xs rounded-full px-2.5 py-1 font-bold bg-slate-700/60 text-slate-200 border border-slate-600/40">${escapeHtml(cliente.frecuencia || "Sin frecuencia")}</span>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
            <div class="text-slate-500 mb-1">Ultima compra</div>
            <div class="text-white">${escapeHtml(cliente.ultima_compra || "Sin fecha")}</div>
          </div>
          <div class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
            <div class="text-slate-500 mb-1">Recencia</div>
            <div class="text-white">${cliente.dias_sin_compra == null ? "Sin dato" : `${cliente.dias_sin_compra} dias`}</div>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
            <div class="text-xs text-slate-500 font-semibold mb-2">Productos mas frecuentes</div>
            ${renderProductosTop(cliente.top_productos, "Sin productos frecuentes")}
          </section>
          <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
            <div class="text-xs text-slate-500 font-semibold mb-2">Ultimos productos comprados</div>
            ${renderUltimosPedidos(cliente.ultimos_pedidos)}
          </section>
        </div>
      </article>`;
  }

  function renderProveedorCard(proveedor) {
    const productosLista = String(proveedor.productos || "")
      .split(/\r?\n|,|;/)
      .map(item => item.trim())
      .filter(Boolean);
    const productos = productosLista.length
      ? productosLista.map(item => `<span class="text-xs rounded-full px-2.5 py-1 bg-slate-900/70 border border-slate-700/70 text-slate-300">${escapeHtml(item)}</span>`).join("")
      : '<span class="text-xs text-slate-500">Sin productos relacionados</span>';
    return `
      <article class="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4 animate-fade-up">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold text-white truncate">${escapeHtml(proveedor.nombre)}</div>
            <div class="text-xs text-slate-400 mt-1">${escapeHtml(proveedor.contacto_nombre || "Sin contacto")}</div>
            <div class="text-xs text-slate-500 mt-1">${escapeHtml(proveedor.telefono || proveedor.email || "Sin contacto")}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-sm font-display font-bold text-teal-300">${Number(proveedor.ventas_relacionadas || 0)} mov.</div>
            <div class="text-xs text-slate-500">${escapeHtml(proveedor.ultima_venta_relacionada || proveedor.fecha_registro || "Sin fecha")}</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="text-xs rounded-full px-2.5 py-1 font-bold ${proveedor.activo ? 'bg-green-900/40 text-green-300 border border-green-600/40' : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'}">${proveedor.activo ? 'Activo' : 'Inactivo'}</span>
          <span class="text-xs rounded-full px-2.5 py-1 font-bold ${claseEstadoProveedor(proveedor.catalogo_activo > 0 ? 'Con movimiento' : 'Sin movimiento')}">${proveedor.catalogo_activo > 0 ? 'Con movimiento' : 'Sin movimiento'}</span>
        </div>
        <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
          <div class="text-xs text-slate-500 font-semibold mb-2">Portafolio</div>
          <div class="flex flex-wrap gap-2">${productos}</div>
        </section>
        <section class="rounded-xl bg-slate-900/50 border border-slate-700/60 p-3">
          <div class="text-xs text-slate-500 font-semibold mb-2">Productos con mas movimiento</div>
          ${renderProductosTop(proveedor.productos_top, "Sin ventas asociadas")}
        </section>
      </article>`;
  }

  function forwardToast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    }
  }

  window.AdminUI = {
    escapeHtml,
    fmtMoney,
    showToast: forwardToast,
    renderClienteCard,
    renderProveedorCard
  };
})();
