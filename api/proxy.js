export default async function handler(req, res) {
  const APPS_URL = process.env.VITE_APPS_URL;
  const ADMIN_KEY = process.env.VITE_ADMIN_KEY || process.env.ADMIN_KEY;

  if (!APPS_URL || !ADMIN_KEY) {
    return res.status(500).json({ ok: false, error: 'Error de servidor: faltan variables' });
  }

  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const sessionKey = match ? decodeURIComponent(match[1]) : null;

  const url = new URL(APPS_URL);

  if (req.method === 'GET') {
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.append(key, value);
    }
    
    // Si la acción es para el admin, exigir sesión válida
    const accion = req.query.action || req.query.accion;
    if (accion && accion.startsWith('admin_')) {
      if (!sessionKey || sessionKey !== ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: 'No autenticado' });
      }
      url.searchParams.set('clave', ADMIN_KEY);
    }

    try {
      const resp = await fetch(url.toString(), { method: 'GET' });
      const data = await resp.json();
      return res.status(200).json(data);
    } catch(err) {
      return res.status(502).json({ ok: false, error: 'Fallo al conectar con Apps Script' });
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const accion = body.accion || body.action;

    // Si la acción requiere privilegios de admin, proteger
    if (
      (accion && accion.startsWith('admin_')) || 
      ['actualizar_estado', 'actualizar_stock', 'actualizar_costo', 'actualizar_precio', 'archivar_pedido', 'recuperar_pedido', 'modificar_pedido'].includes(accion)
    ) {
      if (!sessionKey || sessionKey !== ADMIN_KEY) {
        return res.status(401).json({ ok: false, error: 'No autenticado' });
      }
      body.clave = ADMIN_KEY;
    }

    try {
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script no procesa application/json via CORS POST
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      return res.status(200).json(data);
    } catch(err) {
      return res.status(502).json({ ok: false, error: 'Fallo al conectar con Apps Script' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
