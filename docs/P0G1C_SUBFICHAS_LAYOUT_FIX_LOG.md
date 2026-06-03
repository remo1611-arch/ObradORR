# P0-G1C · Subfichas layout fix definitivo

Corrección visual exclusiva del bloque **Subelaboraciones culinarias**.

- Se fuerza un ancho mínimo útil de tarjeta de 300 px.
- Si no caben 3 columnas, el grid pasa a 2 o 1 columna.
- El título y la descripción se mantienen dentro del cuadro.
- Se evita el corte letra a letra mediante `word-break: normal` y `hyphens: none`.
- No se modifica lógica funcional, SQLite, APPCC, alérgenos, pedido ni persistencia.
