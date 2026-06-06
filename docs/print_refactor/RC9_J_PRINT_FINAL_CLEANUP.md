# RC9 · Print Final Cleanup

Cierre fino del modelo documental de impresión.

## Cambios

1. **Ficha técnica ampliada**
   - Incluye costes por línea y coste total estimado.
   - No genera bloque de escandallo independiente para evitar convertirla en dossier.

2. **Dossier completo de producción**
   - Mantiene el bloque `Escandallo técnico docente` como fuente económica principal.
   - La tabla de ingredientes de la ficha no repite la columna de coste cuando el escandallo está activo.

3. **Vista de impresión**
   - `print-view.html` queda como salida oficial.
   - Se retira de la interfaz el fallback al visor integrado clásico.
   - Si el navegador bloquea la pestaña automática, se ofrece únicamente el botón para abrir la vista independiente.

## Límites

No se modifica SQLite, recetas, ingredientes, APPCC, alérgenos almacenados ni costes almacenados.
