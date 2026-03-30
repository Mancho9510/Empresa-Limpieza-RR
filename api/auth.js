export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const clave = body.clave;
  const adminKey = process.env.VITE_ADMIN_KEY || process.env.ADMIN_KEY;

  if (!clave || clave !== adminKey) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const cookieStr = `admin_session=${encodeURIComponent(adminKey)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`;

  res.setHeader('Set-Cookie', cookieStr);
  return res.status(200).json({ ok: true });
}
