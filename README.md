# Limpieza RR — Plataforma de E-commerce y Gestión 🧼✨

Bienvenido al repositorio oficial de **Limpieza RR**, una plataforma de comercio electrónico local de alto rendimiento especializada en la venta y gestión de productos de limpieza para el hogar, con despachos enfocados en Bogotá.

Esta aplicación no solo incluye un storefront atractivo para clientes, sino también un **panel de administración avanzado** que gestiona pedidos, facturación, rentabilidad, inventario y relaciones con clientes (CRM simplificado).

## 🚀 Arquitectura Tecnológica

El sitio fue refactorizado y migrado recientemente utilizando tecnologías de última generación para garantizar **SEO, rendimiento óptimo y seguridad**.

- **Framework Principal:** [Next.js 14+ (App Router)](https://nextjs.org/) con React 19.
- **Estilos:** Diseño modular con CSS Puro (Variables, UI unificada "Esmeralda Crystal" con modo claro y oscuro automático).
- **Backend de Datos y Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security).
- **Caché y Optimización:** [Upstash Redis](https://upstash.com/) (Utilizado para manejo de datos de alto rendimiento y límites de transacciones).
- **Analíticas:** **Google Analytics** (Implementado directamente para tracking completo de e-commerce).
- **Deploy:** Optimizado para la plataforma y Edge CDN.

---

## 🛠️ Estructura del Proyecto

```bash
limpieza-rr-v2/
├── public/                 # Assets (fuentes, favicons, PWA manifest)
├── src/
│   ├── app/                # Rutas Next.js App Router (páginas, layouts compartidos)
│   │   ├── admin/          # Panel administrativo privado
│   │   ├── api/            # Route Handlers para funciones de backend
│   │   ├── checkout/       # Experiencia de pago y toma de pedidos
│   │   ├── css/            # UI Framework modular unificado
│   │   └── pedidos/        # Rastreo de pedidos para clientes finales
│   ├── components/         # Componentes React reutilizables (Carousel, Navs, Inputs)
│   └── lib/                # Lógica de negocio
│       ├── auth/           # Validación de sesiones
│       ├── supabase/       # Clientes Supabase SSR / Admin
│       └── validators/     # Esquemas de validación con Zod
└── supabase/
    └── migrations/         # Esquemas de bases de datos, datos en seed y políticas RLS
```

---

## 🔒 Seguridad Implementada

### Supabase Row Level Security (RLS)
La base de datos restringe los accesos directamente a nivel de PostgreSQL:
- Solo las instancias de backend con `service_role` (Route Handlers `/api/*`) tienen permiso para mutar datos privados (Clientes, Facturas, Proveedores, Modificación de Pedidos).
- **Inserción Pública RLS:** La tabla `pedidos` permite y está asegurada para que cualquier visitante inserte un pedido mediante el Checkout **sin exponer la lectura** de otros pedidos o información.

### Control de Sesiones
- Acceso a las rutas de `/admin` y acciones de modificación están protegidas vía Server Components y Middleware evaluando un token seguro de cookies de sesión cifrada `admin_session`.

---

## 📈 SEO y Rendimiento

El sitio implementa múltiples buenas prácticas recomendadas por Google y Vercel:
- **Server Side Rendering (SSR) & Static Generation:** Aumentando la velocidad de carga de productos (LCP muy bajo).
- **Next Image Optimization:** Evitando saltos de diseño (CLS) e imágenes asíncronas pesadas.
- **Tipografías Optimizadas:** Integración con `next/font/google` (`Bricolage Grotesque` y `Plus Jakarta Sans`) configuradas con `swap` para evitar Flash of Unstyled Text (FOUT).
- **Metadatos y Schema Markup:** Configuración completa en el `layout.tsx` (OpenGraph completo, Twitter cards, Manifest PWA base).

---

## ⚙️ Cómo ejecutar el proyecto de forma local

### Prerrequisitos

- Node.js LTS (Versión 18.17 o superior, recomendado 20.x).
- Una cuenta en Supabase.
- Una cuenta en Upstash Redis.

### 1. Clonar el repositorio
```bash
git clone https://github.com/TuUsuario/limpieza-rr.git
cd limpieza-rr
```

### 2. Instalar dependencias
```bash
npm install
# o usando el modo silencioso: npm i
```

### 3. Variables de Entorno (.env.local)

Duplica el `.env.example` como `.env.local` y asigna tus tokens:
```ini
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD_HASH=... # bcrypt() password hash 

UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 4. Lanzar servidor de desarrollo
```bash
npm run dev
```

El servidor web estará corriendo en [http://localhost:3000](http://localhost:3000).

---

## 🖌️ Sistema de Diseño

El proyecto no utiliza frameworks como Tailwind o Bootstrap; todo el layout de la tienda (`src/app/css/*`) es **CSS modular y responsivo de autoría propia** (conocido internamente como la temática _Crystal_).

1. **Tokens (`tokens.css`)**: Contiene la paleta de colores HSL global y los radios de borde en variables para soportar conmutación `light/dark mode`.
2. **Componentes Independientes**: Modulares, controlados a nivel individual y agrupados. 
3. **Persistencia de tema inteligente**: El head block detecta si el usuario está en sistema oscuro o claro previo al pintado para evitar parpadeos brillantes y guarda la preferencia en `localStorage`.

---

✨ *Proyecto desarrollado y documentado con la integración de agentes de inteligencia artificial y supervisión humana.*
