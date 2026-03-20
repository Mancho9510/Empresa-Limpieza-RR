/**
 * analytics.js — Google Analytics 4 para Limpieza RR
 *
 * SETUP:
 * 1. Ve a analytics.google.com → Crear cuenta → Crear propiedad (GA4)
 * 2. En "Flujos de datos" → Agregar flujo → Web → pega tu URL
 * 3. Copia el ID de medición (formato G-XXXXXXXXXX)
 * 4. Reemplaza GA_MEASUREMENT_ID abajo con tu ID real
 * 5. Listo — en producción los eventos se envían automáticamente
 *
 * En desarrollo (localhost) los eventos NO se envían a GA
 * para no contaminar tus estadísticas reales.
 */

const GA_MEASUREMENT_ID = 'G-6J18S54SR0'

// No cargar en localhost ni en dev
const IS_PROD = !['localhost', '127.0.0.1'].includes(window.location.hostname)

/* ── Inicialización ──────────────────────────────────── */
export function initAnalytics() {
  if (!IS_PROD || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return

  // Inyectar script de GA dinámicamente (más limpio que inline en HTML)
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    // Anonimizar IPs (recomendado para GDPR)
    anonymize_ip: true,
    // No enviar datos de usuario automáticamente
    send_page_view: true,
  })

  console.log('[Analytics] GA4 inicializado:', GA_MEASUREMENT_ID)
}

/* ── Eventos de negocio ──────────────────────────────── */

/**
 * Usuario vio un producto (modal abierto)
 */
export function trackViewProduct(product) {
  gtag('event', 'view_item', {
    currency: 'COP',
    value: product.price,
    items: [{
      item_id:       String(product.id),
      item_name:     product.name + ' ' + product.size,
      item_category: product.cat,
      price:         product.price,
    }]
  })
}

/**
 * Usuario agregó un producto al carrito
 */
export function trackAddToCart(product, quantity = 1) {
  gtag('event', 'add_to_cart', {
    currency: 'COP',
    value:    product.price * quantity,
    items: [{
      item_id:       String(product.id),
      item_name:     product.name + ' ' + product.size,
      item_category: product.cat,
      price:         product.price,
      quantity,
    }]
  })
}

/**
 * Usuario inició el checkout (abrió el formulario de pedido)
 */
export function trackBeginCheckout(cartItems, products, subtotal) {
  gtag('event', 'begin_checkout', {
    currency: 'COP',
    value:    subtotal,
    items:    cartItems.map(it => {
      const p = products.find(x => x.id === it.id)
      return {
        item_id:       String(p?.id),
        item_name:     (p?.name || '') + ' ' + (p?.size || ''),
        item_category: p?.cat,
        price:         p?.price,
        quantity:      it.qty,
      }
    })
  })
}

/**
 * Usuario confirmó el pedido (se envió por WhatsApp)
 */
export function trackPurchase(orderData, cartItems, products) {
  const total = Number(orderData.total) || Number(orderData.subtotal) || 0
  gtag('event', 'purchase', {
    currency:      'COP',
    transaction_id: `WA-${Date.now()}`,
    value:          total,
    shipping:       Number(orderData.costo_envio) || 0,
    coupon:         orderData.cupon || '',
    items: cartItems.map(it => {
      const p = products.find(x => x.id === it.id)
      return {
        item_id:       String(p?.id),
        item_name:     (p?.name || '') + ' ' + (p?.size || ''),
        item_category: p?.cat,
        price:         p?.price,
        quantity:      it.qty,
      }
    })
  })
}

/**
 * Usuario buscó un producto
 */
export function trackSearch(query) {
  gtag('event', 'search', { search_term: query })
}

/**
 * Usuario aplicó un cupón
 */
export function trackCoupon(code, discount) {
  gtag('event', 'select_promotion', {
    promotion_name: code,
    creative_name:  'coupon',
    items: [{ coupon: code, discount }]
  })
}

/**
 * Usuario calificó la experiencia
 */
export function trackRating(stars) {
  gtag('event', 'rating', {
    value:       stars,
    event_label: stars + ' estrellas',
  })
}

/* ── Helper interno ──────────────────────────────────── */
function gtag(...args) {
  if (!IS_PROD || !window.gtag) return
  window.gtag(...args)
}