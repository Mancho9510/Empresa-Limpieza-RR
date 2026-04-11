import { useState, useEffect } from 'react'
import { uploadImagenProducto, type ProductoAPI } from '@/lib/store/api-client'
import styles from './inventario.module.css'

interface ProductoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  producto?: ProductoAPI | null
  role: string
}

export default function ProductoModal({ isOpen, onClose, onSave, onDelete, producto, role }: ProductoModalProps) {
  const isSuperAdmin = role === 'superadmin'
  const isEditing = !!producto

  const [formData, setFormData] = useState({
    nombre: '',
    tamano: '',
    categoria: '',
    emoji: '',
    descripcion: '',
    precio: 0,
    costo: 0,
    stock: 0 as number | null,
    imagen: '',
  })

  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (producto) {
      setFormData({
        nombre: producto.nombre || '',
        tamano: producto.tamano || '',
        categoria: producto.categoria || '',
        emoji: producto.emoji || '',
        descripcion: producto.descripcion || '',
        precio: producto.precio || 0,
        costo: producto.costo || 0,
        stock: producto.stock !== null ? producto.stock : null,
        imagen: producto.imagen || '',
      })
    } else {
      setFormData({
        nombre: '', tamano: '', categoria: '', emoji: '', descripcion: '',
        precio: 0, costo: 0, stock: 0, imagen: ''
      })
    }
  }, [producto, isOpen])

  if (!isOpen) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const res = await uploadImagenProducto(file, '1')
      if (res.ok && res.url) {
        setFormData(prev => ({ ...prev, imagen: res.url }))
      } else {
        alert('Error al subir la imagen')
      }
    } catch (err: any) {
      alert(err.message || 'Error de red')
    }
    setUploadingImage(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Solo el superadmin puede enviar precio y costo modificados
    // Si no es superadmin, no enviamos esos campos en la actualización
    const submitData: any = { ...formData }
    if (!isSuperAdmin && isEditing) {
      delete submitData.precio
      delete submitData.costo
    }

    try {
      await onSave(submitData)
      onClose()
    } catch {
      // Error handled in parent
    }
    setLoading(false)
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Nombre *</label>
              <input required className={styles.input} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            
            <div className={styles.field}>
              <label>Categoría</label>
              <input className={styles.input} value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })} />
            </div>

            <div className={styles.field}>
              <label>Tamaño</label>
              <input className={styles.input} value={formData.tamano} onChange={e => setFormData({ ...formData, tamano: e.target.value })} />
            </div>

            <div className={styles.field}>
              <label>Emoji</label>
              <input className={styles.input} value={formData.emoji} onChange={e => setFormData({ ...formData, emoji: e.target.value })} />
            </div>

            {/* Solo superadmin puede ver inputs de precio y costo si se está editando, pero mostramos siempre para crear (y en el backend se valida, aunque crear siendo admin normal requeriremos modificar backend o esconder, ajustaremos backend pero de momento dejamos readonly o disabled para admin normal si editando) */}
            <div className={styles.field}>
              <label>Precio (COP) {isSuperAdmin ? '*' : '(Solo SuperAdmin)'}</label>
              <input 
                type="number" required className={styles.input} 
                disabled={!isSuperAdmin && isEditing}
                value={formData.precio} 
                onChange={e => setFormData({ ...formData, precio: Number(e.target.value) })} 
              />
            </div>

            <div className={styles.field}>
              <label>Costo (COP) {isSuperAdmin ? '*' : '(Solo SuperAdmin)'}</label>
              <input 
                type="number" required className={styles.input} 
                disabled={!isSuperAdmin && isEditing}
                value={formData.costo} 
                onChange={e => setFormData({ ...formData, costo: Number(e.target.value) })} 
              />
            </div>

            <div className={styles.field}>
              <label>Stock inicial (vacio = infinito)</label>
              <input type="number" className={styles.input} placeholder="∞" value={formData.stock ?? ''} onChange={e => {
                const val = e.target.value
                setFormData({ ...formData, stock: val === '' ? null : Number(val) })
              }} />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Descripción</label>
              <textarea className={styles.input} value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} rows={3} />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Imagen del Producto</label>
              <label className={styles.imageUpload}>
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage} onChange={handleImageUpload} />
                {uploadingImage ? (
                  <span>Subiendo...</span>
                ) : formData.imagen ? (
                  <img src={formData.imagen} alt="Preview" className={styles.imageUploadPreview} />
                ) : (
                  <span>Haz clic para subir una foto</span>
                )}
              </label>
            </div>
          </div>

          <div className={styles.modalActions}>
            {isEditing && onDelete && isSuperAdmin && (
              <button type="button" className={styles.btnDanger} onClick={() => {
                if (confirm('¿Seguro que deseas eliminar este producto?')) onDelete(producto.id)
              }}>
                Eliminar Producto
              </button>
            )}
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnSubmit} disabled={loading || uploadingImage}>
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
