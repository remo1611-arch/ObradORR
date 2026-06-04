# Migraciones 2.0 experimental

Migración aplicada de forma no destructiva:

- `culinary_recipes.documentary_status`
- `culinary_recipes.workshop_validation_status`
- `bakery_recipes.documentary_status`
- `bakery_recipes.workshop_validation_status`
- `workshop_validation_log`
- registro en `migrations_log`

No se migran recetas entre tablas. No se altera ninguna fórmula.
