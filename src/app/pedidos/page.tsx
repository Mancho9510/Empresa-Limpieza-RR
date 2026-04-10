import { Metadata } from 'next'
import PedidosClient from './PedidosClient'

export const metadata: Metadata = {
  title: 'Rastrear mi pedido',
  description: 'Consulta el estado y avance de tus pedidos en Limpieza RR.',
}

export default function PedidosPage() {
  return <PedidosClient />
}
