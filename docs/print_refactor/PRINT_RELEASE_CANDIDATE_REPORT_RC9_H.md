# Informe de cierre de impresión · RC9-K

## Estado

La refactorización de impresión RC9 queda cerrada como candidata técnica tras las fases:

- RC9-A · Auditoría y mapa de impresión.
- RC9-B · Modelos neutrales de impresión.
- RC9-C · Resolución de opciones y matriz de bloques.
- RC9-D · Secciones imprimibles.
- RC9-E · `print-view.html` independiente.
- RC9-F · CSS de impresión A4 externo.
- RC9-G · Subelaboraciones, panadería y escandallo por modelo.
- RC9 · Regresión documental y cierre.

## Decisiones consolidadas

- Los modelos no se nombran por ciclo ni nivel educativo.
- `Pedido` pasa a `Pedido de producción`.
- La vista principal de impresión es `print-view.html`.
- El visor integrado queda como fallback.
- El CSS de impresión vive en `app/css/print-document.css`.
- El modelo documental y el render quedan separados por secciones.
- SQLite se mantiene como fuente de verdad.

## Prueba manual pendiente antes de release pública

Aunque la validación automática es correcta, se recomienda una prueba visual real de PDF en PC y móvil antes de etiquetar como versión pública final.
