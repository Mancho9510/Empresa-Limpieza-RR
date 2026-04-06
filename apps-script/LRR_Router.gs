/* ──────────────────────────────────────────────────────────────
   LRR_Router.gs
   Dispatcher centralizado de la API de Apps Script
────────────────────────────────────────────────────────────── */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
    var ss     = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case "productos":         return doGet_productos(e, ss);
      case "cupon":             return doGet_cupon(e, ss);
      case "historial":         return doGet_historial(e, ss);
      case "estado":            return doGet_estado(e, ss);
      case "resenas":           return doGet_resenas(e, ss);
      case "admin_productos":   return doGet_admin_productos(e, ss);
      case "admin_pedidos":     return doGet_admin_pedidos(e, ss);
      case "admin_dashboard":   return doGet_admin_dashboard(e, ss);
      case "admin_rentabilidad":return doGet_admin_rentabilidad(e, ss);
      case "admin_clientes":    return doGet_admin_clientes(e);
      case "admin_proveedores": return doGet_admin_proveedores(e);
      default:
        return jsonResponse({ ok: false, error: "Accion no reconocida: " + action });
    }
  } catch(err) {
    Logger.log("Error en doGet: " + err.message + "\n" + err.stack);
    logError("doGet", err);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (body.accion === "calificacion") {
      guardarCalificacion(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_estado") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarEstadoPedido(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_stock") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarStockProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "actualizar_costo") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      var resultadoCosto = actualizarCostoProducto(ss, body);
      return jsonResponse(resultadoCosto);
    }
    if (body.accion === "actualizar_precio") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      actualizarPrecioProducto(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "admin_clientes_upsert")    return doPost_admin_clientes_upsert(e);
    if (body.accion === "admin_clientes_eliminar")  return doPost_admin_clientes_eliminar(e);
    if (body.accion === "admin_proveedores_upsert") return doPost_admin_proveedores_upsert(e);
    if (body.accion === "admin_proveedores_eliminar") return doPost_admin_proveedores_eliminar(e);
    if (body.accion === "archivar_pedido") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      archivarPedido(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "recuperar_pedido") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      recuperarPedido(ss, body);
      return jsonResponse({ ok: true });
    }
    if (body.accion === "modificar_pedido") {
      if (body.clave !== getAdminKey()) return jsonResponse({ ok: false, error: "No autorizado" });
      modificarPedido(ss, body);
      return jsonResponse({ ok: true });
    }

    // ── Nuevo pedido ── validar primero, luego procesar
    validarBodyPedido(body);           // lanza Error si falta algo requerido
    return procesarNuevoPedido(ss, body);

  } catch (err) {
    Logger.log("Error doPost: " + err.message);
    logError("doPost", err);
    return jsonResponse({ ok: false, error: err.message });
  }
}
