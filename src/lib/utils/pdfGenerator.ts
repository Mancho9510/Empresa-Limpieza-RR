import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function generarFacturaPDF(pedido: any) {
  const doc = new jsPDF()

  // Colores corporativos (Teal, gris)
  const primaryColor: [number, number, number] = [38, 166, 154] 
  const textColor: [number, number, number] = [51, 51, 51]

  try {
     // Intenta cargar el logo si existe
     const resLogo = await fetch('/logo_factura.jpg')
     if (resLogo.ok) {
       const blob = await resLogo.blob()
       const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
       })
       // Si el logo es muy rectangular o cuadrado, ajustar medidas
       doc.addImage(base64, 'JPEG', 14, 10, 60, 60)
     }
  } catch (e) {
     console.warn('No se pudo cargar el logo de la factura', e)
  }

  // Info Empresa
  doc.setFontSize(22)
  doc.setTextColor(...primaryColor)
  doc.text('Limpieza RR', 140, 25, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text('Servicios Profesionales de Aseo', 140, 32, { align: 'center' })
  doc.text('NIT: Pendiente', 140, 38, { align: 'center' })
  doc.text('WhatsApp: +57 300 000 0000', 140, 44, { align: 'center' })

  // Separador
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 75, 196, 75)

  // Info Factura/Pedido
  doc.setFontSize(14)
  doc.setTextColor(...primaryColor)
  doc.text('RECIBO DE VENTA', 14, 85)

  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.text(`N° Orden: LRR-${String(pedido.id).padStart(5, '0')}`, 14, 95)
  doc.text(`Fecha: ${new Date(pedido.fecha).toLocaleDateString('es-CO')}`, 14, 101)
  doc.text(`Estado Pago: ${pedido.estado_pago}`, 14, 107)

  // Info Cliente
  doc.setFontSize(12)
  doc.text('Facturado a:', 120, 85)
  doc.setFontSize(10)
  doc.text(`Nombre: ${pedido.nombre}`, 120, 95)
  doc.text(`Teléfono: ${pedido.telefono}`, 120, 101)
  doc.text(`Dirección: ${pedido.direccion || 'N/A'}, ${pedido.barrio || ''}`, 120, 107)
  if (pedido.ciudad) doc.text(`Ciudad: ${pedido.ciudad}`, 120, 113)

  const items = Array.isArray(pedido.productos_json) ? pedido.productos_json : []
  
  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const tableBody = items.map((item: any) => [
    item.nombre + (item.tamano ? ` (${item.tamano})` : ''),
    item.qty,
    fmt(item.precio),
    fmt(item.precio * item.qty)
  ])

  autoTable(doc, {
    startY: 125,
    head: [['Descripción', 'Cantidad', 'V. Unitario', 'Subtotal']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: 10 }
  })

  const finalY = (doc as any).lastAutoTable.finalY || 150

  // Totales
  doc.setFontSize(11)
  doc.text('Subtotal:', 140, finalY + 15)
  doc.text(fmt(pedido.subtotal || pedido.total), 180, finalY + 15, { align: 'right' })

  if (pedido.descuento > 0 || pedido.cupon) {
    doc.setTextColor(239, 68, 68)
    doc.text(`Descuento (${pedido.cupon || 'General'}):`, 140, finalY + 22)
    doc.text(`-${fmt(pedido.descuento)}`, 180, finalY + 22, { align: 'right' })
    doc.setTextColor(...textColor)
  }

  if (pedido.costo_envio > 0) {
    doc.text('Envío:', 140, finalY + 29)
    doc.text(fmt(pedido.costo_envio), 180, finalY + 29, { align: 'right' })
  }

  doc.setFontSize(14)
  doc.setFont('', 'bold')
  const totalOffset = pedido.costo_envio > 0 ? 38 : (pedido.descuento > 0 ? 31 : 24)
  doc.text('TOTAL:', 140, finalY + totalOffset)
  doc.setTextColor(...primaryColor)
  doc.text(fmt(pedido.total), 180, finalY + totalOffset, { align: 'right' })

  // Footer
  doc.setFont('', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text('¡Gracias por confiar en Limpieza RR!', 105, 280, { align: 'center' })
  doc.text('Este documento sirve como soporte de su compra.', 105, 285, { align: 'center' })

  return doc.output('blob')
}
