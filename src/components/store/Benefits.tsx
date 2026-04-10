import styles from './Benefits.module.css'

const benefits = [
  { emoji: '💪', title: 'Potencia Real', desc: 'Fórmulas concentradas que eliminan hasta la suciedad más difícil.' },
  { emoji: '🌿', title: 'Eco-Amigable', desc: 'Ingredientes que cuidan el planeta sin sacrificar rendimiento.' },
  { emoji: '🌸', title: 'Aromas Premium', desc: 'Fragancias duraderas que transforman cada espacio de tu hogar.' },
  { emoji: '💰', title: 'Mejor Precio', desc: 'Calidad superior a precios accesibles. Más limpieza por menos.' },
  { emoji: '🚚', title: 'Envío Nacional', desc: 'Llevamos nuestros productos a toda Colombia de forma segura.' },
  { emoji: '⭐', title: 'Garantía', desc: 'Si no estás satisfecho, te devolvemos tu dinero. Sin preguntas.' },
]

export default function Benefits() {
  return (
    <section className={styles.section} id="beneficios">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: 'center' }}>
          ¿Por qué somos <span className="gradient-text">Premium?</span>
        </h2>
        <p className="section-subtitle" style={{ textAlign: 'center' }}>
          Cada producto está diseñado para ofrecer resultados excepcionales
        </p>
        <div className={styles.grid}>
          {benefits.map((b, i) => (
            <div key={i} className={styles.card} style={{ animationDelay: `${i * 100}ms` }}>
              <span className={styles.icon}>{b.emoji}</span>
              <h3 className={styles.cardTitle}>{b.title}</h3>
              <p className={styles.cardDesc}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
