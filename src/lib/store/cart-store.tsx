'use client'

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from 'react'

/**
 * Cart Store — Limpieza RR
 * Maneja el estado del carrito con persistencia en localStorage.
 */

export interface CartItem {
  id: string
  nombre: string
  tamano?: string
  precio: number
  qty: number
  emoji?: string
  imagen?: string
}

interface CartState {
  items: CartItem[]
  coupon: { code: string; type: 'pct' | 'fixed'; value: number; label: string } | null
}

interface CartContextValue {
  items: CartItem[]
  coupon: CartState['coupon']
  totalItems: number
  subtotal: number
  discount: number
  total: number
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  applyCoupon: (coupon: CartState['coupon']) => void
  removeCoupon: () => void
}

// ─── External Store ─────────────────────────────────────────
const STORAGE_KEY = 'lrr_cart'
let listeners: Array<() => void> = []
let state: CartState = { items: [], coupon: null }

function getSnapshot(): CartState {
  return state
}

const emptyState: CartState = { items: [], coupon: null }
function getServerSnapshot(): CartState {
  return emptyState
}

function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
  // Persist
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

// Load from localStorage on init
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      state = JSON.parse(saved)
    }
  } catch { /* ignore */ }
}

// ─── Context ────────────────────────────────────────────────
const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    const existing = state.items.find((i) => i.id === item.id)
    if (existing) {
      state = {
        ...state,
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        ),
      }
    } else {
      state = {
        ...state,
        items: [...state.items, { ...item, qty: 1 }],
      }
    }
    emitChange()
  }, [])

  const removeItem = useCallback((id: string) => {
    state = {
      ...state,
      items: state.items.filter((i) => i.id !== id),
    }
    emitChange()
  }, [])

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      state = { ...state, items: state.items.filter((i) => i.id !== id) }
    } else {
      state = {
        ...state,
        items: state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
      }
    }
    emitChange()
  }, [])

  const clearCart = useCallback(() => {
    state = { items: [], coupon: null }
    emitChange()
  }, [])

  const applyCoupon = useCallback((coupon: CartState['coupon']) => {
    state = { ...state, coupon }
    emitChange()
  }, [])

  const removeCoupon = useCallback(() => {
    state = { ...state, coupon: null }
    emitChange()
  }, [])

  const totalItems = cart.items.reduce((s, i) => s + i.qty, 0)
  const subtotal = cart.items.reduce((s, i) => s + i.precio * i.qty, 0)

  let discount = 0
  if (cart.coupon) {
    if (cart.coupon.type === 'pct') {
      discount = Math.round(subtotal * (cart.coupon.value / 100))
    } else {
      discount = cart.coupon.value
    }
  }

  const total = Math.max(0, subtotal - discount)

  return (
    <CartContext.Provider
      value={{
        items: cart.items,
        coupon: cart.coupon,
        totalItems,
        subtotal,
        discount,
        total,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
