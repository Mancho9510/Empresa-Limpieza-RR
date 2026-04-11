'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './PWAInstallPrompt.module.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type DeviceType = 'android' | 'ios' | 'desktop' | 'unknown'

function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

const DISMISSED_KEY = 'lrr-pwa-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [device, setDevice] = useState<DeviceType>('unknown')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)
  const [step, setStep] = useState<'prompt' | 'success'>('prompt')

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return

    // Don't show if recently dismissed
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) {
        const ts = parseInt(dismissed, 10)
        if (Date.now() - ts < DISMISS_DURATION_MS) return
      }
    } catch {
      // ignore
    }

    const det = detectDevice()
    setDevice(det)

    // Listen for browser's native install prompt (Chrome/Edge/Android)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Small delay so page loads first
      setTimeout(() => setVisible(true), 2500)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show manual instructions after delay
    if (det === 'ios') {
      const timer = setTimeout(() => setVisible(true), 2500)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    }

    // Desktop (no native prompt available yet): show after short delay
    // We'll still try and fall back gracefully
    if (det === 'desktop') {
      const timer = setTimeout(() => setVisible(true), 3000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // ignore
    }
    setVisible(false)
  }, [])

  const handleInstall = useCallback(async () => {
    if (device === 'ios') {
      setShowIOSSteps(true)
      return
    }

    if (deferredPrompt) {
      setInstalling(true)
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setStep('success')
          setTimeout(() => setVisible(false), 3000)
        } else {
          dismiss()
        }
      } catch {
        dismiss()
      } finally {
        setInstalling(false)
        setDeferredPrompt(null)
      }
      return
    }

    // Fallback: no native prompt yet (desktop). Show browser instructions.
    setShowIOSSteps(true)
  }, [device, deferredPrompt, dismiss])

  if (!visible) return null

  const isMobile = device === 'android' || device === 'ios'
  const canNativeInstall = deferredPrompt !== null

  return (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={dismiss}
        role="presentation"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`${styles.modal} ${isMobile ? styles.modalMobile : styles.modalDesktop}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-title"
        aria-describedby="pwa-desc"
      >
        {step === 'success' ? (
          /* Success state */
          <div className={styles.successState}>
            <div className={styles.successIcon}>🎉</div>
            <h2 className={styles.successTitle}>¡Instalación exitosa!</h2>
            <p className={styles.successText}>
              Limpieza RR ya está en tu dispositivo. Encuéntrala en tu pantalla de inicio.
            </p>
          </div>
        ) : showIOSSteps ? (
          /* Manual installation steps */
          <div className={styles.inner}>
            <button
              className={styles.backBtn}
              onClick={() => setShowIOSSteps(false)}
              aria-label="Volver"
            >
              ← Volver
            </button>
            <h2 className={styles.title} id="pwa-title">
              Cómo instalar
            </h2>
            {device === 'ios' ? (
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <strong>Tap el botón Compartir</strong>
                    <span className={styles.stepIcon}>⬆️</span>
                    <p>En la barra inferior de Safari</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <strong>Selecciona &ldquo;Agregar a pantalla de inicio&rdquo;</strong>
                    <span className={styles.stepIcon}>➕</span>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <strong>Toca &ldquo;Agregar&rdquo;</strong>
                    <p>¡Listo! Abre la app desde tu pantalla de inicio.</p>
                  </div>
                </li>
              </ol>
            ) : (
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <strong>Busca el ícono de instalación</strong>
                    <span className={styles.stepIcon}>💻</span>
                    <p>En la barra de dirección de Chrome/Edge, busca el ícono &ldquo;Instalar&rdquo; (⊕)</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <strong>Haz clic en &ldquo;Instalar&rdquo;</strong>
                    <p>Se creará un acceso directo en tu escritorio</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <strong>¡Abre la app!</strong>
                    <p>Accede a Limpieza RR desde tu escritorio o menú de inicio</p>
                  </div>
                </li>
              </ol>
            )}
            <button
              className={`${styles.actionBtn} ${styles.btnPrimary}`}
              onClick={dismiss}
            >
              Entendido
            </button>
          </div>
        ) : (
          /* Main prompt */
          <div className={styles.inner}>
            {/* Close button */}
            <button
              className={styles.closeBtn}
              onClick={dismiss}
              aria-label="Cerrar"
              id="pwa-close-btn"
            >
              ✕
            </button>

            {/* App icon */}
            <div className={styles.appIconWrap}>
              <img
                src="/icons/icon-192.png"
                alt="Limpieza RR"
                className={styles.appIcon}
              />
              <div className={styles.appIconBadge}>
                {isMobile ? '📱' : '💻'}
              </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
              <h2 className={styles.title} id="pwa-title">
                Instala{' '}
                <span className={styles.brandName}>Limpieza RR</span>
              </h2>
              <p className={styles.description} id="pwa-desc">
                {isMobile
                  ? 'Agrega la app a tu pantalla de inicio para acceso rápido, sin navegador y sin usar datos innecesarios.'
                  : 'Instala la app en tu computador para acceso rápido desde el escritorio, funciona incluso sin internet.'}
              </p>

              {/* Benefits */}
              <ul className={styles.benefits}>
                <li>
                  <span className={styles.benefitIcon}>⚡</span>
                  Carga instantánea
                </li>
                <li>
                  <span className={styles.benefitIcon}>📶</span>
                  Funciona sin internet
                </li>
                <li>
                  <span className={styles.benefitIcon}>🔔</span>
                  Pedidos al instante
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                className={`${styles.actionBtn} ${styles.btnPrimary}`}
                onClick={handleInstall}
                disabled={installing}
                id="pwa-install-btn"
              >
                {installing ? (
                  <span className={styles.spinner} />
                ) : (
                  <span className={styles.installIcon}>
                    {isMobile ? '📲' : '⬇️'}
                  </span>
                )}
                {installing
                  ? 'Instalando…'
                  : canNativeInstall
                  ? 'Instalar app'
                  : device === 'ios'
                  ? 'Ver instrucciones'
                  : 'Cómo instalar'}
              </button>

              <button
                className={`${styles.actionBtn} ${styles.btnGhost}`}
                onClick={dismiss}
                id="pwa-dismiss-btn"
              >
                Ahora no
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
