import styles from './Benefits.module.css'

const benefits = [
  { emoji: '💡', title: 'Fórmulas concentradas', desc: 'Nuestros productos están diseñados con una alta concentración de activos limpiadores, lo que significa mayor poder de limpieza con menos producto. Rinden más, duran más y cuidan tu bolsillo.', tag: 'Hasta 3x más rendimiento' },
  { emoji: '🏆', title: 'Materias primas de calidad', desc: 'Trabajamos exclusivamente con materias primas de alta calidad, seleccionadas para garantizar resultados superiores en cada uso. Sin compromisos, sin rellenos innecesarios.', tag: 'Calidad certificada' },
  { emoji: '⚡', title: 'Eficiencia garantizada', desc: 'Cada producto está formulado para ser efectivo desde la primera aplicación. Menos esfuerzo, mejores resultados — eso es lo que distingue un producto premium de uno ordinario.', tag: 'Resultados comprobados' },
  { emoji: '🌿', title: 'Eco-amigables', desc: 'Un producto concentrado no solo limpia mejor — también es más amigable con el medio ambiente al requerir menor cantidad por uso y generar menos residuos.', tag: 'Impacto positivo' },
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
              {b.tag && <span className={styles.cardTag}>{b.tag}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
