# RC22-0 · Preflight de política documental

Fecha técnica: 2026-06-04T15:27:49Z

## Alcance

Corrección mínima de modelo documental antes de Lote 7 y fase DATA. No se modifican fórmulas, procesos, rendimientos ni motor de impresión.

## Cambios

1. `culinary_recipes.release_status` pasa de `DEFAULT 'validada'` a `DEFAULT 'pendiente'`.
2. `bakery_recipes.release_status` pasa de `DEFAULT 'validada'` a `DEFAULT 'pendiente'`.
3. `release_status` queda restringido a `pendiente`, `no_apta`, `validada`.
4. `bakery_recipes.yield_status` mantiene `DEFAULT 'pending'` y queda restringido a `pending`, `tested`, `validated`.
5. Las inserciones JS de fichas nuevas fuerzan explícitamente `release_status='pendiente'`.
6. Las inserciones JS de fichas panaderas nuevas fuerzan `yield_status='pending'`.
7. La edición ordinaria ya no ofrece la opción `Validada`.
8. Metadatos residuales de versión/cache actualizados a RC22-0.

## Validación

- Integrity check: `ok`
- Foreign key check: `0` incidencias
- Cocina activa: `[('no_apta', 2), ('pendiente', 202)]`
- Panadería activa: `[('no_apta', 1), ('pendiente', 96)]`
- Smoke test cocina: nueva ficha sin release_status nace como `pendiente`
- Smoke test panadería: nueva ficha sin release_status/yield_status nace como `pendiente` / `pending`

## Decisión

RC22-0 queda preparado como base para ejecutar Lote 7 por diferencia. La cobertura documental sigue sin equivaler a validación gastronómica.
