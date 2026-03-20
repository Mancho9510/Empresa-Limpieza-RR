/**
 * toast.js — Sistema de notificaciones toast
 *
 * Uso:
 *   import { showToast } from './ui/toast.js'
 *   showToast('✅ Producto agregado')
 */

export function showToast(msg, duration = 3000) {
  // Eliminar toast anterior si existe
  document.querySelector('.toast-msg')?.remove()

  const t = document.createElement('div')
  t.className = 'toast-msg'
  t.textContent = msg

  // Estilos inline para que funcione antes de que cargue el CSS
  Object.assign(t.style, {
    position:    'fixed',
    bottom:      '112px',
    left:        '50%',
    transform:   'translateX(-50%) translateY(80px)',
    background:  '#0F766E',
    color:       '#fff',
    borderRadius: '50px',
    padding:     '13px 28px',
    fontWeight:  '600',
    fontSize:    '.9rem',
    zIndex:      '9999',
    transition:  'transform .4s cubic-bezier(.4,0,.2,1)',
    whiteSpace:  'nowrap',
    boxShadow:   '0 16px 48px rgba(13,148,136,.18)',
    pointerEvents: 'none',
  })

  document.body.appendChild(t)
  requestAnimationFrame(() => {
    t.style.transform = 'translateX(-50%) translateY(0)'
  })

  setTimeout(() => {
    t.style.transform = 'translateX(-50%) translateY(80px)'
    setTimeout(() => t.remove(), 400)
  }, duration)
}
