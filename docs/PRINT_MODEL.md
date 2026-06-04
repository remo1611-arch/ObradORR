# Modelo de impresión · ObradORR 1.0.0-rc.21

## Flujo real actual

```text
SQLite → consultas/cálculos → modelo de documento → render HTML → iframe → impresión/PDF
```

La RC21 mantiene el cargador clásico compatible con Android/Termux, pero separa el flujo lógico en funciones diferenciadas:

- `buildPrintDocumentModel(items, opts)`: normaliza opciones, perfil y contexto de deduplicación.
- `renderPrintDocumentModel(model)`: construye el HTML imprimible.
- `presentPrintDocument(html, title)`: presenta el iframe y permite imprimir/guardar PDF.
- `recordPrintJob(items, opts, html)`: registra metadatos de impresión sin almacenar HTML pesado.

## Perfiles

Ver `docs/PRINT_PROFILES.md`.

## Criterios de cierre

- Sin `window.open`.
- Vista previa interna en iframe.
- Pedido consolidado separado de auditoría.
- Checks de costes y APPCC respetados.
- Subrecetas deduplicadas por identidad documental.
- Bases técnicas plegadas fuera de auditoría.
- Alérgenos directos y derivados siempre visibles.
- Fichas como propuesta documental pendiente hasta prueba real de obrador.

## Límites

La impresión no valida fórmulas ni rendimientos. La versión `validada` queda reservada a prueba real documentada por el profesorado o el centro.
