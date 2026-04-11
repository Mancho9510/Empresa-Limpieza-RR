'use client'

import { useState, useMemo } from 'react'
import { useCart } from '@/lib/store/cart-store'
import { useToast } from '@/components/ui/Toast'
import type { ProductoAPI } from '@/lib/store/api-client'
import styles from './ProductGrid.module.css'

interface ProductGridProps {
  productos: ProductoAPI[]
}

export default function ProductGrid({ productos }: ProductGridProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [selectedProduct, setSelectedProduct] = useState<ProductoAPI | null>(null)
  const { items, addItem, updateQty } = useCart()
  const { toast } = useToast()

  const categories = useMemo(() => {
    const cats = new Set(productos.map((p) => p.categoria).filter(Boolean))
    return ['Todos', ...Array.from(cats).sort()]
  }, [productos])

  const [showAgotados, setShowAgotados] = useState(false)

  const filtered = useMemo(() => {
    const list = productos.filter((p) => {
      const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.categoria.toLowerCase().includes(search.toLowerCase())
      const matchCat = category === 'Todos' || p.categoria === category
      return matchSearch && matchCat
    })

    // Algoritmo de ordenamiento: 1. Con foto. 2. Sin foto. 3. Agotados (al final)
    return list.sort((a, b) => {
      const isOutA = a.stock !== null && a.stock !== undefined && a.stock <= 0
      const isOutB = b.stock !== null && b.stock !== undefined && b.stock <= 0
      
      if (isOutA && !isOutB) return 1
      if (!isOutA && isOutB) return -1
      
      const hasImgA = !!a.imagen
      const hasImgB = !!b.imagen
      
      if (hasImgA && !hasImgB) return -1
      if (!hasImgA && hasImgB) return 1
      
      return a.nombre.localeCompare(b.nombre)
    })
  }, [productos, search, category])

  const handleAdd = (p: ProductoAPI) => {
    addItem({
      id: p.id,
      nombre: p.nombre,
      tamano: p.tamano,
      precio: p.precio,
      emoji: p.emoji,
      imagen: p.imagen,
    })
    toast(`${p.emoji || '📦'} ${p.nombre} agregado al carrito`, 'success')
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const getItemQty = (id: string) => {
    return items.find(i => i.id === id)?.qty || 0
  }

  const renderProductCard = (p: ProductoAPI, i: number) => {
    const qty = getItemQty(p.id)
    const isOutOfStock = p.stock !== null && p.stock !== undefined && p.stock <= 0
    
    return (
      <div
        key={p.id}
        className={`card ${styles.productCard} ${isOutOfStock ? styles.outOfStockCard : ''}`}
        style={{ animationDelay: `${i * 50}ms` }}
        onClick={() => setSelectedProduct(p)}
      >
        {p.destacado && !isOutOfStock && <span className={styles.featured}>⭐ Destacado</span>}
        {isOutOfStock && <span className={styles.agotadoBadge}>Agotado</span>}
        
        <div className={styles.cardEmoji}>
          {p.imagen ? (
            <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '150px' }} className={isOutOfStock ? styles.outOfStockImage : ''} />
          ) : (
            p.emoji || '📦'
          )}
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardName}>{p.nombre}</h3>
          {p.tamano && <span className={styles.cardSize}>{p.tamano}</span>}
          {p.categoria && <span className={styles.cardCat}>{p.categoria}</span>}
          <div className={styles.cardFooter}>
            <span className={styles.cardPrice}>{fmt(p.precio)}</span>
            
            {/* Controles de Cantidad Nativos */}
            <div onClick={(e) => { e.stopPropagation(); if (isOutOfStock) e.preventDefault(); }}>
              {isOutOfStock ? (
                <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.6 }}>Agotado</button>
              ) : qty > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-pill)', padding: '2px 6px' }}>
                  <button className="btn btn-icon btn-sm" onClick={() => updateQty(p.id, qty - 1)}>-</button>
                  <span style={{ fontWeight: 'bold' }}>{qty}</span>
                  <button className="btn btn-icon btn-sm" onClick={() => updateQty(p.id, qty + 1)}>+</button>
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAdd(p)}
                  id={`add-${p.id}`}
                >
                  + Agregar
                </button>
              )}
            </div>
            
          </div>
        </div>
      </div>
    )
  }

  const availableProducts = filtered.filter(p => !(p.stock !== null && p.stock !== undefined && p.stock <= 0))
  const exhaustedProducts = filtered.filter(p => p.stock !== null && p.stock !== undefined && p.stock <= 0)

  return (
    <section className={styles.section} id="productos">
      <div className="container">
        <h2 className="section-title">Nuestros Productos</h2>
        <p className="section-subtitle">Calidad premium que marca la diferencia</p>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
              id="product-search"
            />
          </div>
          <div className={styles.categories}>
            {categories.map((cat) => (
               <button
                key={cat}
                className={`${styles.catBtn} ${category === cat ? styles.catActive : ''}`}
                onClick={() => setCategory(cat)}
               >
                {cat}
               </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos Disponibles */}
        {availableProducts.length > 0 && (
          <div className="grid-products">
            {availableProducts.map(renderProductCard)}
          </div>
        )}

        {/* Contenedor de Productos Agotados (Desplegable) */}
        {exhaustedProducts.length > 0 && (
          <div style={{ marginTop: 'var(--space-2xl)', textAlign: 'center' }}>
            <button 
              onClick={() => setShowAgotados(!showAgotados)} 
              className="btn btn-secondary"
              style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {showAgotados ? '⬆ Ocultar agotados' : `⬇ Ver ${exhaustedProducts.length} agotados`}
            </button>

            {showAgotados && (
              <div className="grid-products" style={{ marginTop: 'var(--space-lg)', opacity: 0.8 }}>
                {exhaustedProducts.map(renderProductCard)}
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 && (
          <div className={styles.noResults}>
            <span>🔍</span>
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
         <>
           <div className="overlay" onClick={() => setSelectedProduct(null)} />
           <div className={`modal ${styles.modal}`}>
             <div className={styles.modalContent}>
               <button className={styles.modalClose} onClick={() => setSelectedProduct(null)}>✕</button>
               <div className={styles.modalEmoji}>
                 {selectedProduct.imagen ? (
                   <img src={selectedProduct.imagen} alt={selectedProduct.nombre} style={{ maxHeight: '200px', objectFit: 'contain', margin: '0 auto' }} />
                 ) : (
                   selectedProduct.emoji || '📦'
                 )}
               </div>
               <h3 className={styles.modalName}>{selectedProduct.nombre}</h3>
               {selectedProduct.tamano && <p className={styles.modalSize}>{selectedProduct.tamano}</p>}
               {selectedProduct.categoria && <span className={`badge badge-info ${styles.modalCat}`}>{selectedProduct.categoria}</span>}
               {selectedProduct.descripcion && <p className={styles.modalDesc}>{selectedProduct.descripcion}</p>}
               <p className={styles.modalPrice}>{fmt(selectedProduct.precio)}</p>
               {selectedProduct.stock !== null && selectedProduct.stock !== undefined && (
                 <p className={styles.modalStock}>
                   {selectedProduct.stock > 0
                     ? `✅ ${selectedProduct.stock} en stock`
                     : '❌ Agotado'}
                 </p>
               )}
               <button
                 className="btn btn-primary btn-lg"
                 onClick={() => {
                   handleAdd(selectedProduct)
                   setSelectedProduct(null)
                 }}
                 disabled={selectedProduct.stock !== null && selectedProduct.stock !== undefined && selectedProduct.stock <= 0}
                 style={{ width: '100%', marginTop: 'var(--space-md)' }}
               >
                 🛒 Agregar al carrito
               </button>
             </div>
           </div>
         </>
       )}
    </section>
  )
}
