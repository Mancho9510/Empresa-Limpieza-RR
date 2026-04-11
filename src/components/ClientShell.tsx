'use client'

import { useState, type ReactNode } from 'react'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { CartProvider } from '@/lib/store/cart-store'
import { ToastProvider } from '@/components/ui/Toast'
import Nav from '@/components/ui/Nav'
import Footer from '@/components/ui/Footer'
import Cart from '@/components/store/Cart'
import Checkout from '@/components/store/Checkout'
import ReviewButton from '@/components/ui/ReviewButton'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'

/**
 * ClientShell — wraps the entire app with all providers and interactive chrome.
 * Manages: cart sidebar, checkout modal, and review FAB globally.
 */
export default function ClientShell({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const handleOpenCheckout = () => {
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  return (
    <ThemeProvider>
      <CartProvider>
        <ToastProvider>
          <Nav onCartOpen={() => setCartOpen(true)} />
          <main style={{ paddingTop: '72px', minHeight: '100vh' }}>
            {children}
          </main>
          <Footer />

          {/* Sidebar del carrito */}
          <Cart
            isOpen={cartOpen}
            onClose={() => setCartOpen(false)}
            onCheckout={handleOpenCheckout}
          />

          {/* Modal flotante de checkout */}
          <Checkout
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
          />

          {/* Botón flotante de reseña (en todas las páginas) */}
          <ReviewButton />
          
          {/* Prompt de instalación PWA (flotante, global) */}
          <PWAInstallPrompt />
        </ToastProvider>
      </CartProvider>
    </ThemeProvider>
  )
}
