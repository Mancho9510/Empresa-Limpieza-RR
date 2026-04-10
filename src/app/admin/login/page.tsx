'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { postLogin } from '@/lib/store/api-client'
import styles from './login.module.css'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await postLogin(password)
      if (res.ok) {
        router.push('/admin/dashboard')
      } else {
        setError('Contraseña incorrecta')
      }
    } catch {
      setError('Error al conectar con el servidor')
    }

    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoEmoji}>🔒</span>
          <h1 className={styles.title}>Panel Admin</h1>
          <p className={styles.subtitle}>Limpieza RR</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="admin-password" className={styles.label}>
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa la contraseña"
              className={styles.input}
              autoFocus
              required
            />
          </div>

          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              'Acceder'
            )}
          </button>
        </form>

        <p className={styles.back}>
          <a href="/">← Volver a la tienda</a>
        </p>
      </div>
    </div>
  )
}
