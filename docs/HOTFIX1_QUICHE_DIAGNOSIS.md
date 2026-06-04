# HOTFIX1 · Diagnóstico Quiche

## Resultado

`REC-QUICHE-LORRAINE` no presenta regresión de datos.

- `release_status`: `pendiente`.
- Líneas activas: base salada/neutra mediante `PAS053 · Masa quebrada refrigerada`.
- No existe subreceta activa `REC-PAST-QUEBRADA-DULCE` asociada a la quiche.
- El texto residual aparece en notas históricas/documentales: “Sustituye pasta quebrada dulce...”.

## Corrección aplicada

La regla `QUICHE_MASA_DULCE` deja de buscar en notas históricas y evalúa solo líneas activas reales: nombres de ingredientes y subrecetas activas.

## Criterio

Un preflight no debe generar críticos a partir de textos de auditoría histórica que documentan una corrección ya aplicada.
