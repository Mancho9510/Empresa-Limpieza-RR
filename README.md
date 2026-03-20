# 🧴 Limpieza RR v2

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
# → Abre http://localhost:3000 automáticamente

# 3. Build para producción
npm run build
# → Genera dist/ optimizado

# 4. Previsualizar build
npm run preview
```

## Estructura

```
src/
├── index.html          ← Tienda
├── admin.html          ← Panel admin
├── input.css           ← Entry point Tailwind
├── js/
│   ├── app.js          ← Entry point tienda
│   ├── admin.js        ← Entry point admin
│   ├── modules/        ← Módulos por responsabilidad
│   │   ├── api.js
│   │   ├── cart.js
│   │   ├── ui/toast.js
│   │   └── admin/
│   └── helpers/
│       ├── format.js
│       └── validators.js
├── css/
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   ├── animations.css
│   └── responsive.css
└── assets/icons/
```

## Configuración

En `src/js/modules/api.js`, cambia `APPS_SCRIPT_URL` por tu URL de Apps Script.

## Apps Script

Los archivos `.gs` viven en `apps-script/` — **no requieren cambios**.
