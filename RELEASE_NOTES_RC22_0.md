# RELEASE NOTES · ObradORR 1.0.0-rc.22-0

## Naturaleza de la versión

RC22-0 es un preflight de política documental sobre RC21. No corrige fórmulas, no modifica rendimientos, no cambia procesos gastronómicos y no parchea el motor de impresión.

## Cambios aplicados

- `culinary_recipes.release_status`: `DEFAULT 'pendiente'` y restricción de valores `pendiente/no_apta/validada`.
- `bakery_recipes.release_status`: `DEFAULT 'pendiente'` y restricción de valores `pendiente/no_apta/validada`.
- `bakery_recipes.yield_status`: restricción de valores `pending/tested/validated`, manteniendo `DEFAULT 'pending'`.
- Creación de fichas nuevas desde la app: fuerza `release_status='pendiente'`.
- Creación de fichas panaderas nuevas: fuerza también `yield_status='pending'`.
- Editor ordinario: retira la opción `Validada`; solo permite borrador/propuesta o revisada documentalmente.
- Metadatos de versión actualizados a RC22-0.

## Política documental

Todas las fichas siguen siendo propuestas técnicas documentales pendientes de prueba real de obrador. El estado `validada` queda reservado a validación posterior documentada por profesorado/centro.

## Validación realizada

- `PRAGMA integrity_check`: ok
- `PRAGMA foreign_key_check`: 0 incidencias
- Fichas activas con `release_status='validada'`: cocina 0 · panadería/pastelería 0
- Smoke test cocina sin `release_status`: pendiente
- Smoke test panadería sin `release_status/yield_status`: pendiente / pending

## Límite

Esta versión no sustituye el Lote 7 ni la corrección conceptual ficha a ficha. Solo blinda la política documental antes de la fase DATA.
