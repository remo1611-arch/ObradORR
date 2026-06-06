# Contrato de secciones imprimibles · RC9-E

| ID | Sección | Tipo | Cuándo aparece | Adaptador clásico |
|---|---|---|---|---|
| `document_header` | Encabezado documental | metadata | Siempre | `printHeader()` |
| `preflight` | Comprobación documental previa | quality | Siempre, puede devolver vacío | `preflightPrintHtml()` |
| `recipe_index` | Índice de elaboraciones | navigation | Fichas / Fichas + pedido | `printIndexHtml()` |
| `recipe_sheets` | Fichas de elaboración | recipe | Fichas / Fichas + pedido | `recipeSheetHtml()` |
| `production_order` | Pedido de producción | order | Pedido / Fichas + pedido | `orderHtml()` |

## Regla de diseño

Cada sección queda identificada por contrato antes de renderizarse. Esto permite evolucionar hacia `print-view.html` y CSS de impresión dedicado sin volver a mezclar decisiones de interfaz, modelo documental y salida PDF.
