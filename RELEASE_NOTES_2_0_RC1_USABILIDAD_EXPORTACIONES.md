# ObradORR 2.0.0 RC1 · Usabilidad y exportaciones

Rama construida sobre `ObradORR_2_0_0_EXPERIMENTAL_FINAL_ALLINONE`.

## Alcance

- No migra `culinary_recipes` ↔ `bakery_recipes`.
- No cambia fórmulas ni valida fichas.
- Mantiene SQLite, funcionamiento local/offline y compatibilidad Termux/PC.
- Añade mejoras reales de uso diario: editor más cómodo y exportaciones externas.

## Cambios principales

1. Editor de fichas a pantalla amplia.
2. Edición por secciones: identidad, proceso, APPCC/notas.
3. Textareas amplias para redacción cómoda.
4. Borrador local/autosave en navegador.
5. Botones: guardar y seguir, duplicar, crear variante, preflight.
6. Exportaciones: pedido CSV/TSV, catálogo CSV, ingredientes CSV, alérgenos CSV, práctica JSON, JSON técnico, práctica ZIP.
7. ZIP de práctica con HTML imprimible, pedido, alérgenos y JSON de respaldo.

## Límites

- No sustituye la prueba real de obrador.
- No incorpora validación sensorial, mermas ni rendimientos reales.
- El PDF sigue saliendo desde navegador; no se ha reescrito un motor PDF editorial desde cero.
