# ObradORR 2.1.0-RC7 · Excel Hotfix 2

## Alcance

Corrección limitada al exportador Excel del catálogo completo.

## Correcciones

1. `02_ELABORACIONES`: se mantiene el parche del Hotfix 1.
   - El `UNION ALL` se envuelve en una subconsulta externa antes del `ORDER BY`.
   - Evita `1st ORDER BY term does not match any column in the result set`.

2. `03_INGREDIENTES`: se corrige una consulta no compatible con el esquema real.
   - `v_ingredients_cost` no expone la columna `notes`.
   - El exportador obtiene ahora las notas desde `ingredients.notes` mediante `LEFT JOIN ingredients i ON i.id = v.id`.
   - Evita `no such column: notes` al descargar el catálogo Excel completo.

## No modificado

- Base SQLite incluida.
- Fichas, ingredientes, alérgenos, APPCC, costes y líneas de receta.
- Política documental, `release_status` y validación de obrador.
- Persistencia IndexedDB.

## Nota de caché

El sufijo de carga pasa a `?v=obradorr-210-rc8-release-candidate` para forzar la descarga del JS corregido en navegador móvil o escritorio.
