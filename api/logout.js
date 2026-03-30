export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');
  return res.status(200).json({ ok: true });
}
