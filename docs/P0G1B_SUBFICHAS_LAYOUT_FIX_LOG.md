# P0-G1B · Subfichas layout fix

Fecha: 2026-06-03

Alcance: corrección visual del bloque `Subelaboraciones culinarias`.

Cambios aplicados:

- Se sustituyó el marcado interno de `.radio-card` para envolver título y descripción en `.radio-card-text`.
- Se eliminó el uso visual de `<br>` dentro de tarjetas radio mediante CSS.
- Se sustituyó `overflow-wrap:anywhere` por `overflow-wrap:break-word` y `word-break:normal` para evitar cortes letra a letra.
- Se configuró `.radio-row` con `auto-fit` y `minmax(min(100%,220px),1fr)` para permitir 3, 2 o 1 columnas según ancho disponible.
- Se mantiene responsive a 1 columna en móvil.

No se modificaron datos, APPCC, alérgenos, pedido, persistencia ni versionado.
