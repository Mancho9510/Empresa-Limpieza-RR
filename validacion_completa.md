# Validación Completa — Limpieza RR v2

Auditoría exhaustiva del estado actual vs. los problemas reportados anteriormente y el plan de refactorización por fases.

---

## Resumen Ejecutivo

| Categoría | Resuelto | Parcial | Pendiente |
|---|:---:|:---:|:---:|
| **Fase 0 – Seguridad** | 3 | 2 | 1 |
| **Problemas Estructurales** | 2 | 0 | 4 |
| **Problemas Menores** | 0 | 1 | 4 |
| **Nuevos hallazgos** | — | — | 4 |

---

## ✅ Fase 0 — Lo que SÍ se hizo

### 1. Variables de entorno en el frontend
- [config.js](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/admin/config.js) usa `import.meta.env.VITE_*` ✅
- [app.js](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/app.js) CONFIG usa `import.meta.env.VITE_APPS_URL` ✅
- [.env.local](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/.env.local) creado y en [.gitignore](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/.gitignore) ✅
- `LIMPIEZARR2025` **no aparece** en ningún archivo dentro de `src/` ✅

### 2. `admin.logic.JS` eliminado
- No existe en `src/` ni referencia a él ✅
- El conflicto de namespaces `window.AdminApi`/`window.AdminUI` ha desaparecido ✅

### 3. Router [doGet](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#93-123) refactorizado
- [LIMPIEZARR_Setup.gs:98-122](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#L98-L122): `switch/case` limpio con 11 acciones ✅
- [doPost](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#712-759) también usa dispatcher (`body.accion`) con validación ✅

### 4. [onEditar](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Dashboard.gs#113-167) corregido (BUG-08)
- [LIMPIEZARR_Dashboard.gs:118-166](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Dashboard.gs#L118-L166): solo formatea la fila editada, no toda la hoja ✅

### 5. Utilidades centralizadas en backend
- [calcGanancia()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#18-35), [logError()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#67-101), [getAdminKey()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#119-137), [parsearProductosPedido()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#165-191) centralizados en [LIMPIEZARR_Utils.gs](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs) ✅
- [leerSheet()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#335-369) para lectura eficiente existe (línea 344) ✅
- Cache helpers ([cacheGet](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#370-390)/[cachePut](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#391-402)/[cacheDelete](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#403-406)) implementados ✅

---

## ⚠️ Fase 0 — Lo que quedó A MEDIAS

### 1. Clave admin sigue como fallback hardcoded en Apps Script

> [!CAUTION]
> [LIMPIEZARR_Utils.gs:135](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#L135):
> ```js
> return (typeof ADMIN_KEY !== "undefined") ? ADMIN_KEY : "LIMPIEZARR2025";
> ```
> Si no se configura `PropertiesService`, la clave sigue siendo `LIMPIEZARR2025`.

**Acción**: Configurar la clave en *Archivo → Propiedades del proyecto → Script Properties* en Apps Script y **eliminar** el fallback `"LIMPIEZARR2025"` de la línea 135.

### 2. Clave admin viaja como query parameter, no como header

> [!WARNING]
> [admin-api.js:9](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/admin/admin-api.js#L9): `url.searchParams.set('clave', ADMIN_KEY);`
> [modules/api.js:9](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/modules/api.js#L9): mismo problema

La clave aparece en la URL, visible en logs de red, historial del navegador y DevTools.
El plan original decía: *"Pasar la clave como header HTTP: `Authorization: Bearer <key>`"*.

**Nota**: Apps Script ignora headers custom en [doGet](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#93-123). Para GET requests, el query param es la única opción sin un proxy intermedio (Edge Functions de Vercel, Fase 1).

### 3. Autenticación sigue siendo client-side

[auth.js:14](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/admin/auth.js#L14):
```js
if (loginInput.value.trim() === ADMIN_KEY) {
```
La comparación ocurre en el navegador. Aunque `ADMIN_KEY` viene de `import.meta.env`, Vite la inyecta **literalmente** en el bundle de producción. Cualquiera puede extraerla del JS minificado.

---

## 🔴 Problemas Críticos PENDIENTES

### 1. `actualizarDashboard()` se ejecuta en cada pedido nuevo

[LIMPIEZARR_Setup.gs:800](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#L800):
```js
try { actualizarDashboard(ss); }
catch(e7) { Logger.log("Dashboard: " + e7.message); }
```
Esto recorre **todos** los pedidos, productos y clientes para actualizar la hoja Dashboard del Sheet. Con 500+ pedidos, puede exceder el límite de 6 min de Apps Script y fallar silenciosamente.

**Acción**: Mover a un trigger horario o eliminarlo del flujo del pedido.

### 2. `getDataRange().getValues()` sin límites persiste

A pesar de tener [leerSheet()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#335-369) disponible, hay **6 funciones** que siguen usando `getDataRange()`:

| Archivo | Función | Línea |
|---|---|---|
| [LIMPIEZARR_Setup.gs](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs) | [doGet_productos](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#124-141) | 130 |
| [LIMPIEZARR_Setup.gs](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs) | [doGet_admin_dashboard](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#336-489) | 363 |
| [LIMPIEZARR_Setup.gs](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs) | [doGet_admin_rentabilidad](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#490-711) | 535, 590 |
| [LIMPIEZARR_Formato.gs](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Formato.gs) | [buildProviderDemandIndex](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Formato.gs#200-233) | 204 |
| [LIMPIEZARR_Utils.gs](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs) | [recalcularStockDesdePedidos](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#236-289) | 256 |

Solo [doGet_admin_pedidos](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#284-335) usa [leerSheet()](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Utils.gs#335-369).

### 3. [app.js](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/app.js) sigue siendo un monolito de 1673 líneas

Contiene estado global, lógica de negocio, DOM, fetch, carrusel, carrito, pedido, cupones, PWA, analytics y reseñas en un solo archivo. Los módulos en `src/js/modules/` existen pero **`app.js` no los importa**.

[modules/admin/index.js](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/modules/admin/index.js) tiene un `TODO`: *"Los módulos admin se poblarán en la Fase 3"*.

### 4. `MARGEN_DESEADO = 80` hardcodeado

[LIMPIEZARR_Proveedores.gs:17](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Proveedores.gs#L17): Variable global que hay que editar manualmente.

---

## 🟡 Problemas Menores PENDIENTES

### 1. `sanitizeDriveUrl` / `sanitizeImgUrl` — 3 implementaciones idénticas

| Ubicación | Nombre |
|---|---|
| `LIMPIEZARR_Setup.gs:44` | `sanitizeDriveUrl()` |
| `app.js:59` | `sanitizeImgUrl()` |
| `helpers/format.js:19` | `sanitizeImgUrl()` (exportada) |

### 2. `CACHE_KEY = "lrr_prods_v1"` sin invalidación
[app.js:230](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/app.js#L230): TTL de 30 min. Si cambias un precio en Sheets, el cliente puede mostrar el precio viejo durante media hora.

### 3. `console.group` diagnósticos nunca se quitaron
[admin-api.js:36-40](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/admin/admin-api.js#L36-L40) y [modules/api.js:36-40](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/modules/api.js#L36-L40): marcados como *"quitar cuando todo funcione"*, siguen ahí.

### 4. `hacerBackup()` puede crear duplicados
[LIMPIEZARR.gs:220](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR.gs#L218-L242): si se ejecuta dos veces en el mismo minuto, crea hojas con nombres idénticos.

### 5. `clasificarCliente` tiene condición redundante
[LIMPIEZARR_Setup.gs:993-994](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/apps-script/LIMPIEZARR_Setup.gs#L993-L994):
```js
if (pedidos >= 3 || gastado >= 150000) return "Recurrente";
if (pedidos >= 2) return "Recurrente";  // redundante, ya cubierto arriba
```

---

## 🆕 Nuevos Hallazgos

### 1. `admin-api.js` y `modules/api.js` son archivos DUPLICADOS

Son **idénticos** (misma estructura, mismas funciones, mismo export). Ambos importan desde rutas de config distintas pero con el mismo contenido. Uno debería eliminarse y el otro reutilizarse.

### 2. `LIMPIEZARR_Formato.gs` está MAL NOMBRADO

El archivo se llama "Formato" pero contiene **toda la lógica de proveedores** (endpoints CRUD, demand index, mapping). El nombre correcto sería algo como `LIMPIEZARR_Proveedores_Endpoints.gs`. Confunde la estructura del proyecto.

### 3. `modules/api.js` importa `config.js` desde `./config.js`

[modules/api.js:4](file:///d:/Empresa%20Limpieza%20RR%20V2.0.0.1/limpieza-rr-v2/src/js/modules/api.js#L4): `import { APPS_URL, ADMIN_KEY } from './config.js';`

No existe un `src/js/modules/config.js`. Si Vite resuelve esto, es por casualidad. Lo más probable es que este import falle en producción ya que el `config.js` real está en `src/js/admin/config.js`.

### 4. `verificarClave` vs comparación directa — dos patrones coexisten

En Apps Script:
- `doGet_admin_productos` usa: `getAdminKey()` compare directo (línea 249)
- `doGet_admin_proveedores` usa: `verificarClave(clave)` (línea 9 de LIMPIEZARR_Formato.gs)
- `doPost` acciones usan: `body.clave !== getAdminKey()` (directo)

Inconsistencia menor pero genera confusión.

---

## Estado del Plan de Fases

| Fase | Estado | Comentario |
|---|---|---|
| **Fase 0 – Seguridad** | 🟡 Parcial | Env vars ✅, admin.logic.JS ✅, pero: fallback LIMPIEZARR2025, clave en query param, auth client-side |
| **Fase 1 – Edge Functions** | 🔴 No iniciada | Sin proxy Vercel, sin headers HTTP para auth |
| **Fase 2 – Supabase Auth** | 🔴 No iniciada | — |
| **Fase 3 – Migración BD** | 🔴 No iniciada | — |
| **Fase 4 – Sanitización** | 🟡 Parcial | `validarBodyPedido()` existe ✅, pero falta Zod, CSP headers, escapeHtml consolidado |

---

## Prioridades Inmediatas (lo que se puede hacer hoy)

1. **Eliminar fallback `"LIMPIEZARR2025"`** de `LIMPIEZARR_Utils.gs:135` y configurar `PropertiesService`
2. **Mover `actualizarDashboard(ss)`** fuera de `procesarNuevoPedido` → trigger horario
3. **Eliminar `modules/api.js`** (duplicado de `admin/admin-api.js`)
4. **Quitar `console.group` diagnósticos** de `admin-api.js`
5. **Migrar funciones que usan `getDataRange()`** a `leerSheet()`
