const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n ?? 0)

function buildProductRows(pedido: any): string {
  const items = Array.isArray(pedido.productos_json) ? pedido.productos_json : []
  return items
    .map((item: any) => {
      const qty = Number(item.qty) || 1
      const precio = Number(item.precio) || 0
      return `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;color:#1e293b;">
          <strong>${item.nombre}${item.tamano ? ` <small style="color:#64748b;">(${item.tamano})</small>` : ''}</strong>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;">${qty}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;">${fmt(precio)}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#1a4231;">${fmt(precio * qty)}</td>
      </tr>`
    })
    .join('')
}

/**
 * Email para el CLIENTE — versión amigable y visual
 */
export function generateClientEmailHtml(pedido: any): string {
  const orderDate = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const orderId = `LRR-${String(pedido.id || '?').padStart(5, '0')}`
  const metodos: Record<string, string> = {
    NEQUI: 'Nequi 💜', TRANSFERENCIA: 'Transferencia 🏦', BREB: 'Breb 💙', DAVIPLATA: 'Daviplata ❤️', CONTRA_ENTREGA: 'Contra Entrega 🚪'
  }

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Confirmación de Pedido — Limpieza RR</title></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f1f5f9;margin:0;padding:40px 20px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f766e,#1a4231);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">✨ Limpieza RR</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">¡Tu pedido ha sido confirmado!</p>
    </div>

    <div style="padding:28px 28px 0;">
      <p style="font-size:17px;color:#0f172a;margin:0 0 6px;">Hola <strong>${pedido.nombre}</strong>,</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 20px;">Hemos recibido tu pedido exitosamente. Te contactaremos pronto por WhatsApp para coordinar la entrega. 🚚</p>

      <!-- Datos del pedido -->
      <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px;border-left:4px solid #0f766e;">
        <p style="margin:4px 0;color:#475569;font-size:14px;"><strong style="color:#0f172a;">N° Orden:</strong> ${orderId}</p>
        <p style="margin:4px 0;color:#475569;font-size:14px;"><strong style="color:#0f172a;">Fecha:</strong> ${orderDate}</p>
        <p style="margin:4px 0;color:#475569;font-size:14px;"><strong style="color:#0f172a;">Dirección:</strong> ${pedido.direccion}${pedido.casa ? ', ' + pedido.casa : ''}, ${pedido.barrio} — ${pedido.ciudad}</p>
        ${pedido.zona_envio ? `<p style="margin:4px 0;color:#475569;font-size:14px;"><strong style="color:#0f172a;">Zona:</strong> ${pedido.zona_envio}</p>` : ''}
        <p style="margin:4px 0;color:#475569;font-size:14px;"><strong style="color:#0f172a;">Pago:</strong> ${metodos[pedido.pago] || pedido.pago}</p>
      </div>

      <!-- Tabla de productos -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#0f766e;">
            <th style="padding:10px 8px;color:#fff;text-align:left;font-size:13px;border-radius:6px 0 0 0;">Producto</th>
            <th style="padding:10px 8px;color:#fff;text-align:center;font-size:13px;">Cant.</th>
            <th style="padding:10px 8px;color:#fff;text-align:right;font-size:13px;">Precio</th>
            <th style="padding:10px 8px;color:#fff;text-align:right;font-size:13px;border-radius:0 6px 0 0;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${buildProductRows(pedido)}</tbody>
      </table>

      <!-- Totales -->
      <div style="text-align:right;border-top:2px solid #e2e8f0;padding-top:14px;margin-bottom:24px;">
        <p style="margin:4px 0;color:#475569;font-size:14px;">Subtotal: <strong>${fmt(pedido.subtotal)}</strong></p>
        ${pedido.descuento > 0 ? `<p style="margin:4px 0;color:#16a34a;font-size:14px;">Descuento (${pedido.cupon || ''}): <strong>-${fmt(pedido.descuento)}</strong></p>` : ''}
        <p style="margin:4px 0;color:#475569;font-size:14px;">Envío: <strong>${pedido.costo_envio > 0 ? fmt(pedido.costo_envio) : 'A convenir'}</strong></p>
        <div style="font-size:20px;font-weight:800;color:#0f766e;margin-top:8px;">TOTAL: ${fmt(pedido.total)}</div>
      </div>

      ${pedido.pago !== 'CONTRA_ENTREGA' ? `
      <div style="background:#fef9e7;border:1px dashed #f59e0b;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#92400e;">💳 Recuerda realizar tu pago</p>
        <p style="margin:0;font-size:14px;color:#b45309;">Nequi / Daviplata / Breb: <strong>320 334 6819</strong></p>
        <p style="margin:6px 0 0;font-size:12px;color:#b45309;">Envía el comprobante por WhatsApp al: <strong>+57 350 344 3140</strong></p>
      </div>` : ''}

      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://wa.me/573503443140?text=${encodeURIComponent(`Hola, mi pedido es ${orderId}, aquí está mi comprobante de pago 🧾`)}"
           style="background:#25D366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-weight:700;font-size:15px;display:inline-block;">
          💬 Confirmar por WhatsApp
        </a>
      </div>
    </div>

    <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
        <strong>Limpieza RR</strong> — Servicios Profesionales de Aseo<br>
        WhatsApp: <a href="https://wa.me/573503443140" style="color:#0f766e;">+57 350 344 3140</a> | 
        <a href="mailto:limpiezarradmin@gmail.com" style="color:#0f766e;">limpiezarradmin@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Email para el ADMINISTRADOR — versión completa con todos los datos
 */
export function generateAdminEmailHtml(pedido: any): string {
  const orderDate = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const orderId = `LRR-${String(pedido.id || '?').padStart(5, '0')}`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nuevo Pedido Admin — ${orderId}</title></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#0f172a;margin:0;padding:30px 20px;">
  <div style="max-width:620px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <!-- Header Admin -->
    <div style="background:#0f766e;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <h2 style="color:#fff;margin:0;font-size:20px;">🔔 Nuevo Pedido Recibido</h2>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${orderDate}</p>
      </div>
      <div style="background:rgba(255,255,255,0.15);padding:8px 16px;border-radius:50px;">
        <span style="color:#fff;font-weight:800;font-size:16px;">${orderId}</span>
      </div>
    </div>

    <div style="padding:24px;">
      <!-- Cliente -->
      <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #334155;">
        <p style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">👤 Datos del Cliente</p>
        <p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Nombre:</strong> ${pedido.nombre}</p>
        <p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Teléfono:</strong> <a href="https://wa.me/57${pedido.telefono}" style="color:#25D366;">+57 ${pedido.telefono}</a></p>
        ${pedido.correo ? `<p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Correo:</strong> ${pedido.correo}</p>` : ''}
        <p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Dirección:</strong> ${pedido.direccion}${pedido.casa ? ', ' + pedido.casa : ''}</p>
        <p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Barrio / Ciudad:</strong> ${pedido.barrio} — ${pedido.ciudad}</p>
        ${pedido.zona_envio ? `<p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Zona:</strong> ${pedido.zona_envio}</p>` : ''}
        <p style="margin:5px 0;color:#e2e8f0;font-size:14px;"><strong>Pago:</strong> ${pedido.pago}</p>
        ${pedido.nota ? `<p style="margin:5px 0;color:#fbbf24;font-size:14px;"><strong>Nota:</strong> ${pedido.nota}</p>` : ''}
      </div>

      <!-- Productos -->
      <div style="margin-bottom:16px;">
        <p style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">🛍️ Productos</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#0f766e;">
              <th style="padding:8px;color:#fff;text-align:left;font-size:12px;">Producto</th>
              <th style="padding:8px;color:#fff;text-align:center;font-size:12px;">Cant.</th>
              <th style="padding:8px;color:#fff;text-align:right;font-size:12px;">Precio</th>
              <th style="padding:8px;color:#fff;text-align:right;font-size:12px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${buildProductRows(pedido)}</tbody>
        </table>
      </div>

      <!-- Totales -->
      <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #334155;text-align:right;">
        <p style="margin:4px 0;color:#94a3b8;font-size:14px;">Subtotal: <strong style="color:#e2e8f0;">${fmt(pedido.subtotal)}</strong></p>
        ${pedido.descuento > 0 ? `<p style="margin:4px 0;color:#4ade80;font-size:14px;">Descuento (${pedido.cupon || 'General'}): <strong>-${fmt(pedido.descuento)}</strong></p>` : ''}
        <p style="margin:4px 0;color:#94a3b8;font-size:14px;">Envío: <strong style="color:#e2e8f0;">${pedido.costo_envio > 0 ? fmt(pedido.costo_envio) : 'A convenir'}</strong></p>
        <div style="font-size:22px;font-weight:800;color:#34d399;margin-top:8px;">TOTAL: ${fmt(pedido.total)}</div>
      </div>

      <!-- Acciones rápidas -->
      <div style="text-align:center;">
        <a href="https://wa.me/57${pedido.telefono}?text=${encodeURIComponent(`Hola ${pedido.nombre}, soy de Limpieza RR. Tu pedido ${orderId} fue recibido y está siendo procesado. ¡Gracias por tu compra! ✨`)}"
           style="background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-weight:700;font-size:14px;display:inline-block;margin-right:10px;">
          📲 Contactar Cliente
        </a>
        <a href="https://empresa-limpieza-rr.vercel.app/admin/pedidos"
           style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-weight:700;font-size:14px;display:inline-block;">
          📋 Ver en Admin
        </a>
      </div>
    </div>
  </div>
</body>
</html>`
}

// Compatibilidad con el nombre anterior
export { generateAdminEmailHtml as generateInvoiceEmailHtml }
