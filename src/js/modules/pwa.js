/**
 * pwa.js — Service Worker y banner de instalación PWA
 */

let deferredPrompt = null

export function initPWA() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
    const banner = document.getElementById('pwaBanner')
    if (banner) { banner.classList.add('show'); setTimeout(() => banner.classList.remove('show'), 15000) }
  })
  // Solo registrar SW en producción
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('/Sw.js')
        .then(() => console.log('SW registrado'))
        .catch(err => console.warn('SW error:', err))
    )
  }
}

export function installPWA() {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null
    document.getElementById('pwaBanner')?.classList.remove('show')
  })
}
export function dismissPWA() { document.getElementById('pwaBanner')?.classList.remove('show') }