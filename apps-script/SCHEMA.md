# Esquema de Base de Datos - Limpieza RR (V3)

Este documento centraliza la arquitectura de columnas utilizada por el backend en Google Apps Script (`LRR_Schema_Ganancias.gs`) en relación con Google Sheets.

**IMPORTANTE:** Apps Script usa un matching por nombre exacto de columna en minúscula (independiente del orden físico). Siempre que la cabecera exista, el backend la encontrará.

## 1. Productos
La tabla maestra del catálogo. Almacenada en la hoja `"Productos"`.
*   **id:** Identificador único autogenerado (ej: `P-J8F3YQ2`). Clave principal.
*   **nombre:** Nombre descriptivo (ej: `Limpiapisos`).
*   **tamano:** Presentación volumétrica (ej: `1 Galón`).
*   **precio:** Precio de venta público final.
*   **costo:** Costo interno de manufactura/compra.
*   **categoria:** Categoría para agrupamiento en UI (ej: `Suavizantes`, `Kits`).
*   **destacado:** (Booleano/Blank) Marca productos estrella.
*   **emoji:** Ícono para destacar en tienda web.
*   **descripcion:** Texto largo para detalles del producto.
*   **imagen, imagen2, imagen3:** Enlaces de Drive (el backend los mapea automáticamente a `uc?export=view` para ser renders de alta velocidad).
*   **stock:** Inventario físico actualizado en tiempo real con alertas a email si `<= 5`.

> **Nota:** La columna *ganancia_pct* fue deprecada arquitectónicamente en la Fase 4 para favorecer el cálculo dinámico y aumentar la velocidad I/O.

## 2. Pedidos
El diario de ventas y envíos. Almacenada en la hoja `"Pedidos"`.
*   **fecha:** Timestamp formateado automatizado de recepción.
*   **nombre, telefono, ciudad, departamento, barrio, direccion, casa, conjunto:** Datos de contacto del cliente.
*   **nota:** Instrucciones especiales dejadas por cliente.
*   **cupon:** Código de descuento aplicado.
*   **descuento:** Monto sustraído.
*   **pago:** Método favorito del cliente (ej: `Nequi`, `Bancolombia`).
*   **zona_envio:** Ruta calculada (ej: `Bosa — $ 8.000`).
*   **costo_envio:** Flete numérico cobrado.
*   **subtotal, total:** Cálculo bruto y matemático final (incluye envío y descuento).
*   **estado_pago:** `PENDIENTE`, `PAGADO`, o `CONTRA ENTREGA`. Modificable desde Panel.
*   **estado_envio:** Lógica logística modificado desde Panel.
*   **productos:** String multilinea antiguo (legibilidad humana en Sheets).
*   **productos_json:** Matriz JSON invisible vital para el parser avanzado sin fallos frente a emojis y símbolos especiales `|`.

## 3. Clientes
Almacén de fidelización autogestionado por inserciones upsert (`upsertCliente`). Almacenada en la hoja `"Clientes"`.
*   **primera_compra, ultima_compra:** Rango de actividad.
*   **nombre, telefono, ciudad, barrio, direccion:** Último Domicilio registrado.
*   **total_pedidos:** Contador acumulado.
*   **total_gastado:** LTV (Life Time Value).
*   **tipo:** Clasificación automática (`VIP`, `Recurrente`, `Nuevo`).

## 4. Cupones
Motor de descuentos para promociones. Almacenada en la hoja `"Cupones"`.
*   **codigo:** Clave escrita (Validada por `LRR_Triggers.gs`).
*   **descripcion:** Motivo u objetivo publicitario.
*   **tipo:** `PORCENTAJE` o `VALOR_FIJO`.
*   **valor:** Entero numérico.
*   **usos_maximos:** Límite global antes de auto-desactivarse.
*   **usos_actuales:** Incrementado vía logica desde Pedidos.
*   **vencimiento:** (Opcional) Fecha de expiración.
*   **activo:** `TRUE`/`FALSE`.

---
**¿Quieres agregar o borrar una nueva columna?**
Puedes añadirla físicamente en Google Sheets donde desees, y luego deberías registrarla en el archivo `LRR_Schema_Ganancias.gs` en la variable `_HEADERS` correspondiente para evitar que sea sobreescrita o borrada por la inicialización.
