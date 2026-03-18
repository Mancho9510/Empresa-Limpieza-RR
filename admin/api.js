const ADMIN_CONFIG = {
  // Cambia esta URL cuando vayas a apuntar el admin a otro deployment de Apps Script.
  APPS_URL: "https://script.google.com/macros/s/AKfycby-dGGJrYSeWPHPscyzIP5ndwA519NZzRpJHSh7TFylsQIooLzRL0qS4Ge2CxNy6CHo/exec",
  ADMIN_KEY: "LIMPIEZARR2025",
};

const AdminApi = (() => {
  function buildUrl(action, params = {}) {
    const url = new URL(ADMIN_CONFIG.APPS_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("clave", ADMIN_CONFIG.ADMIN_KEY);
    url.searchParams.set("t", Date.now());

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      redirect: "follow",
      ...options,
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error("Respuesta invalida del servidor");
    }

    if (!data.ok) {
      throw new Error(data.error || "Error desconocido");
    }

    return data;
  }

  async function get(action, params = {}) {
    return requestJson(buildUrl(action, params));
  }

  async function post(payload) {
    return requestJson(ADMIN_CONFIG.APPS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        ...payload,
        clave: payload.clave || ADMIN_CONFIG.ADMIN_KEY,
      }),
    });
  }

  return {
    config: ADMIN_CONFIG,
    getPedidos(params) {
      return get("admin_pedidos", params);
    },
    getProductos() {
      return get("admin_productos");
    },
    getDashboard(forceRefresh) {
      return get("admin_dashboard", forceRefresh ? { refresh: 1 } : {});
    },
    getRentabilidad(forceRefresh) {
      return get("admin_rentabilidad", forceRefresh ? { refresh: 1 } : {});
    },
    getClientes(params) {
      return get("admin_clientes", params);
    },
    getProveedores(params) {
      return get("admin_proveedores", params);
    },
    updateEstado(payload) {
      return post({ accion: "actualizar_estado", ...payload });
    },
    updateStock(payload) {
      return post({ accion: "actualizar_stock", ...payload });
    },
    updateCosto(payload) {
      return post({ accion: "actualizar_costo", ...payload });
    },
    updatePrecio(payload) {
      return post({ accion: "actualizar_precio", ...payload });
    },
  };
})();

window.ADMIN_CONFIG = ADMIN_CONFIG;
window.AdminApi = AdminApi;
