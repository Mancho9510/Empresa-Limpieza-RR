'use client'

import { useEffect } from 'react'

/**
 * UTMTracker
 * Captura automáticamente parámetros UTM (utm_source, utm_medium, utm_campaign)
 * desde la URL hacia el localStorage. Esto permite saber de dónde vino una venta
 * incluso si el usuario navega por varias páginas antes de hacer checkout.
 */
export default function UTMTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const utmSource = params.get('utm_source')
    const utmMedium = params.get('utm_medium')
    const utmCampaign = params.get('utm_campaign')

    // Si detectamos al menos un UTM, lo guardamos/actualizamos
    if (utmSource || utmMedium || utmCampaign) {
      const trackingData = {
        source: utmSource || 'organic',
        medium: utmMedium || 'none',
        campaign: utmCampaign || 'none',
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem('lrr-utm-tracking', JSON.stringify(trackingData))
    }
  }, [])

  return null
}
