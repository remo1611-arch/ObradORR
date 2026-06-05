# Corrección de validación de obrador · 2.1.0-RC7

La RC1 implementaba validación real, histórico y acta, pero usaba estados panaderos no permitidos por el `CHECK` de `bakery_recipes.yield_status`.

En RC5 se usa el mapeo compatible:

- `validada` → `validated`
- `probada_con_ajustes` → `tested`
- `requiere_revision` → `pending`
- `no_validada` → `pending`

No se modifica la estructura de `bakery_recipes` ni se valida ninguna ficha automáticamente.
