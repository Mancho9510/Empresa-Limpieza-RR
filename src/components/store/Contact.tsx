export default function Contact() {
  return (
    <section id="contacto" style={{ padding: 'var(--space-3xl) 0', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <h2 className="section-title">¿Tienes preguntas? <span className="gradient-text">¡Estamos aquí!</span></h2>
        <p className="section-subtitle">Escríbenos o llámanos, con gusto te atendemos</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', justifyContent: 'center', marginTop: 'var(--space-2xl)' }}>
          
          <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', minWidth: '250px', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🕒</div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-xs)' }}>Horarios de Atención</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Lunes a Viernes<br/>8:00 AM - 6:00 PM</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>Sábados<br/>8:00 AM - 2:00 PM</p>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', minWidth: '250px', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>📱</div>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-xs)' }}>Ventas y Asesoría</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>Escríbenos por WhatsApp para que un asesor te asista con tu pedido.</p>
            <a href="https://wa.me/573000000000" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%' }}>
              💬 Chat en WhatsApp
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
