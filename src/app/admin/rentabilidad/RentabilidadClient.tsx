'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchRentabilidad, fetchProductos, postProductoAccion, type RentabilidadAPI, type ProductoAPI } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'
import styles from './rentabilidad.module.css'

export default function AdminRentabilidadClient() {
  const [data, setData] = useState<RentabilidadAPI | null>(null)
  const [productosBase, setProductosBase] = useState<ProductoAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSel, setMesSel] = useState<string>(new Date().toISOString().slice(0, 7))
  const [searchProd, setSearchProd] = useState('')
  const [catSel, setCatSel] = useState('')
  const [catMap, setCatMap] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Estado para la edición inline de costo operativo
  const [editingCost, setEditingCost] = useState<string | null>(null)
  const [tempCost, setTempCost] = useState<number>(0)

  // Simulador Avanzado
  const [simuladorActivo, setSimuladorActivo] = useState(false)
  const [simProductoId, setSimProductoId] = useState<string>('')
  const [simGananciaPct, setSimGananciaPct] = useState<number>(30)
  const [simCostoEdit, setSimCostoEdit] = useState<number>(0)
  const [updatingSim, setUpdatingSim] = useState(false)

  useEffect(() => {
    // Load products map once to lookup categories and base costs
    fetchProductos().then(res => {
      if (res.ok) {
        setProductosBase(res.data)
        const cmap: Record<string, string> = {}
        res.data.forEach(p => cmap[p.id] = p.categoria || '')
        setCatMap(cmap)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
  }, [mesSel])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetchRentabilidad({ mes: mesSel })
      if (res.ok) setData(res.data)
    } catch {
      toast('Error al cargar datos financieros', 'error')
    }
    setLoading(false)
  }

  const fmt = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

  const handleUpdateCost = async (prodId: string, nuevoCosto: number) => {
     try {
        const prod = productosBase.find(p => p.id === prodId)
        if (!prod) return toast('Producto no encontrado', 'error')
        
        // Guardar directo en la BD para futuros pedidos
        const res = await postProductoAccion('EDITAR', { 
           id: prod.id, 
           updates: { costo: nuevoCosto } 
        })
        if (res.ok) {
           toast('Costo operativo actualizado para futuros pedidos', 'success')
           setEditingCost(null)
           // Actualizar el costo localmente en productosBase para futuras ediciones en la sesión
           setProductosBase(prev => prev.map(p => p.id === prod.id ? { ...p, costo: nuevoCosto } : p))
        } else {
           toast('No se pudo actualizar el costo', 'error')
        }
     } catch(e) {
        toast('Error de red', 'error')
     }
  }

  // Filtrado local de la vista
  const filteredProducts = useMemo(() => {
    if (!data?.productosVendidos) return []
    return data.productosVendidos.filter(p => {
      const matchedSearch = p.nombre.toLowerCase().includes(searchProd.toLowerCase())
      const pCat = catMap[p.id] || ''
      const matchedCat = catSel ? pCat === catSel : true
      return matchedSearch && matchedCat
    })
  }, [data, searchProd, catSel, catMap])

  // Aggregate after filtering to show adjusted totals
  const fStats = useMemo(() => {
     let fIng = 0; let fCost = 0; let fQty = 0;
     filteredProducts.forEach(p => { 
        let cOp = p.costoOp;
        if (!cOp || cOp === 0) {
           const pb = productosBase.find(b => String(b.id) === String(p.id))
           if (pb && pb.costo > 0) cOp = pb.costo * p.qty
        }
        fIng += p.ingresoBruto; 
        fCost += cOp; 
        fQty += p.qty;
     })
     const fGan = fIng - fCost
     const fMarg = fIng > 0 ? (fGan / fIng) * 100 : 0
     
     return { fIng, fCost, fGan, fMarg, fQty }
  }, [filteredProducts, productosBase])

  const categories = Array.from(new Set(Object.values(catMap).filter(Boolean)))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>💰 Rentabilidad Detallada</h1>
        </div>
        <div className={styles.actions}>
          <button 
             className="btn btn-secondary" 
             onClick={() => setSimuladorActivo(!simuladorActivo)}
          >
             {simuladorActivo ? 'Ocultar Simulador' : '📈 Simulador Mágico'}
          </button>
          <input 
            type="month" 
            value={mesSel}
            onChange={e => setMesSel(e.target.value)}
            className={styles.numInput}
          />
        </div>
      </header>

      {simuladorActivo && (
         <div className={styles.simuladorSection}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>🔮 Simulador de Rentabilidad por Producto</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
              Selecciona un producto para ver su costo real operativo, define tu margen de ganancia deseado y aplica el nuevo precio de venta instantáneamente.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: '600px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                 <label style={{ width: '150px' }}>Producto:</label>
                 <select 
                    value={simProductoId} 
                    onChange={e => {
                       const newId = e.target.value
                       setSimProductoId(newId)
                       const prod = productosBase.find(p => String(p.id) === String(newId))
                       setSimCostoEdit(prod?.costo || 0)
                    }} 
                    className={styles.numInput}
                    style={{ flex: 1 }}
                 >
                    <option value="">-- Elige un producto --</option>
                    {productosBase.map(p => (
                       <option key={p.id} value={p.id}>{p.nombre} {p.tamano ? `(${p.tamano})` : ''}</option>
                    ))}
                 </select>
               </div>
               
               {(() => {
                  const pSim = productosBase.find(p => String(p.id) === String(simProductoId))
                  if (!pSim) return null

                  // Cálculo: Precio Venta = Costo / (1 - (Margen / 100))
                  let suggestedPrice = 0
                  const marginDecimal = simGananciaPct / 100
                  const safeMargin = marginDecimal >= 1 ? 0.99 : marginDecimal
                  
                  if (simCostoEdit > 0) {
                     suggestedPrice = Math.round(simCostoEdit / (1 - safeMargin))
                  }

                  // Ganancia proyectada
                  const projectedProfit = suggestedPrice - simCostoEdit

                  return (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                           <div>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Costo Operativo Real:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 $<input 
                                    type="number" 
                                    value={simCostoEdit} 
                                    onChange={e => setSimCostoEdit(Number(e.target.value))} 
                                    className={styles.numInput} 
                                    style={{ width: '100px', fontWeight: 'bold' }} 
                                 />
                              </div>
                           </div>
                           <div>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Precio Actual:</span>
                              <p style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{fmt(pSim.precio)}</p>
                           </div>
                           <div>
                              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block' }}>Margen Deseado (%):</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <input 
                                    type="number" 
                                    value={simGananciaPct} 
                                    onChange={e => setSimGananciaPct(Number(e.target.value))} 
                                    className={styles.numInput} 
                                    style={{ width: '80px', fontWeight: 'bold' }} 
                                 /> <span style={{ fontWeight: 'bold' }}>%</span>
                              </div>
                           </div>
                        </div>
                        
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>Nuevo Precio Sugerido:</span>
                              <p style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--color-primary)' }}>
                                 {simCostoEdit > 0 ? fmt(suggestedPrice) : '⚠️ Ingresa un Costo'}
                              </p>
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                 Ganancia neta proyectada: <strong className={styles.successText}>{fmt(projectedProfit)}</strong>
                              </span>
                           </div>
                           <button 
                              className="btn btn-primary" 
                              disabled={suggestedPrice <= 0 || updatingSim}
                              onClick={async () => {
                                 setUpdatingSim(true)
                                 try {
                                    // Make updates to both price and cost
                                    const tasks = []
                                    tasks.push(postProductoAccion('actualizar_precio', { id: pSim.id, precio: suggestedPrice }))
                                    
                                    // if cost changed via the simulator, also update the cost
                                    if (simCostoEdit !== pSim.costo) {
                                      tasks.push(postProductoAccion('actualizar_costo', { id: pSim.id, costo: simCostoEdit }))
                                    }
                                    
                                    const results = await Promise.all(tasks)
                                    if (results.every(r => r.ok)) {
                                       toast('Precio y Costo guardados', 'success')
                                       setProductosBase(prev => prev.map(p => 
                                         p.id === pSim.id ? { ...p, precio: suggestedPrice, costo: simCostoEdit } : p
                                       ))
                                    } else {
                                       toast('Ocurrió un error parcial o total', 'error')
                                    }
                                 } catch {
                                    toast('Error de red', 'error')
                                 }
                                 setUpdatingSim(false)
                              }}
                           >
                              {updatingSim ? '⏳ Guardando...' : `✅ Aplicar Ajustes`}
                           </button>
                        </div>
                     </div>
                  )
               })()}
            </div>
         </div>
      )}

      {loading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : data ? (
        <div className={styles.content}>
          <div className={styles.stats}>
             <div className={styles.statCard}>
                <h3>Total Pedidos ({mesSel})</h3>
                <p>{data.totalPedidos}</p>
             </div>
             <div className={`${styles.statCard} ${styles.blueBg}`}>
                <h3>Ingresos Brutos</h3>
                <p>{fmt(data.totalIngresos)}</p>
             </div>
             <div className={`${styles.statCard} ${styles.redBg}`}>
                <h3>Inversión OP (Costos)</h3>
                <p>{fmt(data.totalCostos)}</p>
             </div>
             <div className={`${styles.statCard} ${styles.greenBg}`}>
                <h3>Ganancia Real Neta</h3>
                <p>{fmt(fStats.fGan)}</p>
                <span className={styles.badgeSuccess}>Margen: {fStats.fMarg.toFixed(1)}%</span>
             </div>
          </div>

          <div className={styles.breakdownSection}>
             <div className={styles.filtersRow}>
                <h3>Desglose de Productos Vendidos</h3>
                <div className={styles.filters}>
                  <select value={catSel} onChange={e => setCatSel(e.target.value)} className={styles.numInput}>
                    <option value="">Todas las Categorías</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Filtrar por nombre..."
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                    className={styles.numInput}
                    style={{ width: '250px' }}
                  />
                </div>
             </div>

             <div className={styles.filteredStatsRow} style={{ display: (searchProd || catSel) ? 'block' : 'none' }}>
                ⚠️ Estadísticas Filtradas: 
                <span> Vendidos: <strong>{fStats.fQty}</strong></span> | 
                <span> Ingresos: <strong>{fmt(fStats.fIng)}</strong></span> | 
                <span> Costos: <strong className={styles.dangerText}>{fmt(fStats.fCost)}</strong></span> | 
                <span> Ganancia: <strong className={styles.successText}>{fmt(fStats.fGan)} ({fStats.fMarg.toFixed(1)}%)</strong></span>
             </div>

             <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th align="center">Vendidos</th>
                      <th align="right">Ingresos Brutos</th>
                      <th align="right">Costos (Real Histórico)</th>
                      <th align="right">Costo Unit. (Inventario)</th>
                      <th align="right">Ganancia Neta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                       const pBase = productosBase.find(pb => String(pb.id) === String(p.id))
                       
                       let cOpReal = p.costoOp
                       let usadoCostoBase = false
                       if ((!cOpReal || cOpReal === 0) && pBase && pBase.costo > 0) {
                          cOpReal = pBase.costo * p.qty
                          usadoCostoBase = true
                       }
                       
                       const gNeta = p.ingresoBruto - cOpReal
                       const margenPct = p.ingresoBruto > 0 ? (gNeta / p.ingresoBruto) * 100 : 0
                       
                       return (
                        <tr key={`${p.id}-${p.tamano}`}>
                          <td>
                            <strong>{p.nombre}</strong> {p.tamano && <span className={styles.tamano}>- {p.tamano}</span>}
                          </td>
                          <td>{catMap[p.id] || 'General'}</td>
                          <td align="center">{p.qty}</td>
                          <td align="right">{fmt(p.ingresoBruto)}</td>
                          <td align="right" className={styles.dangerText}>
                             {fmt(cOpReal)} {usadoCostoBase && <span title="Costo deducido del actual en BD">*</span>}
                          </td>
                          <td align="right">
                             {editingCost === p.id ? (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                   $<input type="number" value={tempCost} onChange={e => setTempCost(Number(e.target.value))} className={styles.costoInput} autoFocus />
                                   <button className={styles.actionBtn} onClick={() => handleUpdateCost(p.id, tempCost)}>✓</button>
                                   <button className={styles.actionBtn} onClick={() => setEditingCost(null)}>✕</button>
                                </div>
                             ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                   {pBase?.costo ? fmt(pBase.costo) : '$0'}
                                   <button className={styles.actionBtn} onClick={() => { setEditingCost(p.id); setTempCost(pBase?.costo || 0) }}>✎</button>
                                </div>
                             )}
                          </td>
                          <td align="right">
                             <strong className={styles.successText}>{fmt(gNeta)}</strong>
                             <div className={margenPct < 30 ? styles.badgeWarn : styles.badgeValid}>{margenPct.toFixed(1)}%</div>
                          </td>
                        </tr>
                       )
                    })}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && <div className={styles.empty}>No hay resultados con estos filtros.</div>}
             </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
