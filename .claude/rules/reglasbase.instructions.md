```md
description: Reglas base para análisis, refactorización y generación de código en sistemas full-stack con Apps Script, Google Sheets, WhatsApp y frontend moderno.
paths:
  - "src/**/*.ts"
---

# Reglas Base para Auditoría y Refactorización

## 1. Auditoría Full-Stack

- Analiza siempre: frontend (estructura, componentes, estado), backend (Apps Script, lógica, organización), base de datos (Google Sheets), integraciones externas (WhatsApp).
- Evalúa: arquitectura general, separación de responsabilidades, flujo de datos end-to-end, escalabilidad, mantenibilidad.
- Detecta: cuellos de botella, código acoplado, duplicidad de lógica, riesgos de crecimiento.
- Devuelve:
  1. Problemas críticos (rompen el sistema)
  2. Problemas estructurales
  3. Problemas menores
  4. Propuesta de arquitectura ideal
  5. Plan de refactor por fases

## 2. Backend Apps Script

- Aplica arquitectura por capas: Controller, Service, Repository.
- Usa funciones pequeñas, nombres claros y reutilización de lógica.
- Optimiza acceso a Google Sheets: minimiza llamadas, usa lecturas/escrituras masivas, procesa datos en arrays.
- Implementa manejo de errores robusto.
- Entrega:
  1. Código refactorizado
  2. Estructura de carpetas sugerida
  3. Explicación técnica de mejoras

## 3. Frontend

- Promueve componentización, separación lógica/UI, manejo centralizado de estado y reutilización.
- Detecta: código duplicado, componentes gigantes, lógica mezclada con UI.
- Propón:
  1. Estructura recomendada: components/, pages/, services/, store/
  2. Componentes reutilizables
  3. Mejora del flujo de datos
  4. Buenas prácticas Clean Code

## 4. Modelo de Datos (Google Sheets)

- Define estructura ideal en JSON, relaciones entre entidades, normalización, campos obligatorios y validaciones.
- Detecta: datos redundantes, inconsistencias, riesgo de corrupción.
- Entrega:
  - Modelo de datos unificado
  - Reglas de validación

## 5. Optimización Apps Script

- Minimiza cantidad de llamadas a Sheets.
- Usa getValues/setValues en bloque.
- Procesa datos en arrays.
- Implementa cache donde sea posible.
- Reduce loops innecesarios.
- Entrega:
  - Código optimizado
  - Comparación antes vs después
  - Impacto en rendimiento

## 6. Automatización WhatsApp

- Analiza y optimiza el flujo de pedidos vía WhatsApp: recepción, interpretación, registro en Sheets, confirmación.
- Define estructura de mensaje y automatización posible.
- Propón integración con API, respuestas automáticas y validación de pedidos.
- Entrega:
  - Flujo completo optimizado
  - Posible implementación

## 7. Dashboard y Analítica

- Evalúa métricas clave (ventas, inventario, rentabilidad).
- Detecta: métricas faltantes, visualización deficiente, problemas de interpretación.
- Propón:
  1. KPIs clave (margen, rotación inventario, ventas por cliente)
  2. Mejoras visuales
  3. Estructura ideal del dashboard

## 8. UX/UI

- Analiza panel admin, dashboard, formularios y navegación.
- Evalúa jerarquía visual, usabilidad, claridad de acciones y flujo del usuario.
- Detecta: interfaces confusas, sobrecarga visual, falta de consistencia.
- Propón:
  1. Rediseño estructural
  2. Mejora de layout
  3. Sistema de diseño (colores, tipografía, spacing)
  4. Componentes UI reutilizables
- Entrega:
  - Wireframe conceptual (descrito)
  - Reglas de diseño aplicables

---

**Estas reglas deben ser cargadas siempre que se realicen análisis, generación o revisión de código, arquitectura o UX/UI en el sistema.**
````