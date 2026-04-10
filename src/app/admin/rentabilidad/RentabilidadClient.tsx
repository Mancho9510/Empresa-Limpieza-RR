'use client'

import { useState, useEffect, useMemo } from 'react'
import { fetchRentabilidad, fetchProductos, type RentabilidadAPI, type ProductoAPI } from '@/lib/store/api-client'
import { useToast } from '@/components/ui/Toast'
import styles from './rentabilidad.module.css'

export default function AdminRentabilidadClient() {
  const [data, setData] = useState<RentabilidadAPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [mesSel, setMesSel] = useState<string>(new Date().toISOString().slice(0, 7))
  const [searchProd, setSearchProd] = useState('')
  const [catSel, setCatSel] = useState('')
  const [catMap, setCatMap] = useState<Record<string, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    // Load products map once to lookup categories
    fetchProductos().then(res => {
      if (res.ok) {
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
     let fIng = 0; let fCost = 0;
     filteredProducts.forEach(p => { fIng += p.ingresoBruto; fCost += p.costoOp; })
     const fGan = fIng - fCost
     const fMarg = fIng > 0 ? (fGan / fIng) * 100 : 0
     return { fIng, fCost, fGan, fMarg }
  }, [filteredProducts])

  const categories = Array.from(new Set(Object.values(catMap).filter(Boolean)))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>💰 Rentabilidad Detallada</h1>
          <a href="/admin/dashboard" className={styles.backLink}>← Volver al Dashboard</a>
        </div>
        <div className={styles.actions}>
          <input 
            type="month" 
            value={mesSel}
            onChange={e => setMesSel(e.target.value)}
            className={styles.numInput}
          />
        </div>
      </header>

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
                <p>{fmt(data.gananciaNeta)}</p>
                <span className={styles.badgeSuccess}>Margen: {data.margenGeneral.toFixed(1)}%</span>
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

             {(searchProd || catSel) && (
               <div className={styles.filteredStatsRow}>
                  ⚠️ Estadísticas Filtradas: 
                  <span> Ingresos: <strong>{fmt(fStats.fIng)}</strong></span> | 
                  <span> Costos: <strong className={styles.dangerText}>{fmt(fStats.fCost)}</strong></span> | 
                  <span> Ganancia: <strong className={styles.successText}>{fmt(fStats.fGan)} ({fStats.fMarg.toFixed(1)}%)</strong></span>
               </div>
             )}

             <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th align="center">Vendidos</th>
                      <th align="right">Ingresos Brutos</th>
                      <th align="right">Costos (Real)</th>
                      <th align="right">Ganancia Neta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => {
                       const pct = p.margen
                       return (
                        <tr key={`${p.id}-${p.tamano}`}>
                          <td>
                            <strong>{p.nombre}</strong> {p.tamano && <span className={styles.tamano}>- {p.tamano}</span>}
                          </td>
                          <td>{catMap[p.id] || 'General'}</td>
                          <td align="center">{p.qty}</td>
                          <td align="right">{fmt(p.ingresoBruto)}</td>
                          <td align="right" className={styles.dangerText}>{fmt(p.costoOp)}</td>
                          <td align="right">
                             <strong className={styles.successText}>{fmt(p.gananciaNeta)}</strong>
                             <div className={pct < 30 ? styles.badgeWarn : styles.badgeValid}>{pct.toFixed(1)}%</div>
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
