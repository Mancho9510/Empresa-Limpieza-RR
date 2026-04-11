export function generateInvoiceEmailHtml(pedido: any): string {
  // Format the date
  const orderDate = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  });

  const productosHtml = pedido.productos_json
    ?.map(
      (item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
        <strong>${item.nombre}</strong><br>
        <small style="color: #64748b;">Cant: ${item.qty}</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b;">
        ${formatter.format(item.precio * item.qty)}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido - Limpieza RR</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #1a4231; padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; color: #0f172a; margin-bottom: 20px; }
        .order-meta { background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
        .order-meta p { margin: 5px 0; color: #475569; font-size: 14px; }
        .order-meta strong { color: #0f172a; }
        .table-container { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .totals { border-top: 2px solid #e2e8f0; padding-top: 15px; text-align: right; }
        .totals p { margin: 5px 0; color: #475569; font-size: 15px; }
        .totals .final-total { font-size: 18px; font-weight: 700; color: #1a4231; margin-top: 10px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .status-badge { display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #166534; border-radius: 999px; font-size: 12px; font-weight: 600; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Limpieza RR ✨</h1>
          <p style="margin-top: 10px; opacity: 0.9; font-size: 15px;">¡Confirmación oficial de tu pedido!</p>
        </div>
        
        <div class="content">
          <div class="greeting">Hola <strong>${pedido.nombre}</strong>,</div>
          <p style="color: #475569; line-height: 1.6;">Hemos recibido tu pedido correctamente. A continuación, te enviamos el resumen de tu compra. Nos pondremos en contacto contigo muy pronto para coordinar la entrega.</p>
          
          <div class="order-meta">
            <p><strong>Fecha:</strong> ${orderDate}</p>
            <p><strong>Dirección:</strong> ${pedido.direccion}, ${pedido.barrio} - ${pedido.ciudad}</p>
            <p><strong>Método de Pago:</strong> ${pedido.pago}</p>
            <div class="status-badge">Estado: ${pedido.estado_envio || 'Recibido'}</div>
          </div>

          <table class="table-container">
            ${productosHtml}
          </table>

          <div class="totals">
            <p>Subtotal: <strong>${formatter.format(pedido.subtotal)}</strong></p>
            <p>Envío: <strong>${formatter.format(pedido.costo_envio)}</strong></p>
            ${pedido.descuento > 0 ? `<p style="color: #16a34a;">Descuento: <strong>-${formatter.format(pedido.descuento)}</strong></p>` : ''}
            <div class="final-total">TOTAL: ${formatter.format(pedido.total)}</div>
          </div>
        </div>

        <div class="footer">
          <p>Limpieza RR — Calidad y frescura garantizadas.</p>
          <p>Si tienes alguna duda sobre tu pedido, respóndenos a este correo o escríbenos a nuestro WhatsApp oficial.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
