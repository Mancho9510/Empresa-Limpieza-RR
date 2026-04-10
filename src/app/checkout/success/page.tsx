'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import styles from './success.module.css'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [waLink, setWaLink] = useState('')

  useEffect(() => {
    // Launch confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#ffffff']
    })

    const phone = process.env.NEXT_PUBLIC_WA_NUMBER || ''
    const msg = encodeURIComponent(`Hola, acabo de realizar un pedido en la tienda virtual Limpieza RR. ¡Quisiera confirmar los detalles! ✨`)
    setWaLink(`https://wa.me/${phone}?text=${msg}`)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🎉</div>
        <h1 className={styles.title}>¡Pedido Confirmado!</h1>
        <p className={styles.desc}>
          Tu orden ha sido registrada exitosamente en nuestro sistema.
          Nos comunicaremos contigo muy pronto para confirmar el envío.
        </p>

        <div className={styles.actions}>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
            💬 Confirmar por WhatsApp
          </a>
          <button onClick={() => router.push('/')} className={`btn btn-ghost ${styles.backBtn}`}>
            Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  )
}
