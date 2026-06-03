# DATA_MODEL · ObradORR 1.0.0-rc.2

SQLite es la fuente de verdad. IndexedDB conserva la copia local de trabajo. localStorage se limita a preferencias ligeras de impresión.

## Tablas críticas

- `ingredients`: ingredientes y datos de coste/unidad.
- `ingredient_allergens`: relación ingrediente-alérgeno.
- `culinary_recipes`: fichas culinarias.
- `culinary_recipe_lines`: ingredientes o subrecetas culinarias.
- `bakery_recipes`: formulaciones de panadería/pastelería.
- `bakery_recipe_lines`: fórmula panadera, acabados directos y líneas por grupo.
- `bakery_preferments`: prefermentos por receta.
- `bakery_process_steps`: pasos técnicos.
- `bakery_recipe_components`: componentes elaborados asociados a receta panadera/pastelera.
- `media_assets` y `recipe_media`: medios asociados a recetas.
- `work_selection_items`: selección docente activa.
- `class_sessions` y `class_session_items`: sesiones guardadas.
- `print_jobs` y `print_job_items`: registro local de documentos generados.
- `schema_migrations`: control de cambios de esquema/paquete.

## Validaciones 2.0 añadidas

- Ciclos de subrecetas culinarias bloqueados en edición.
- Ciclos de componentes panaderos bloqueados en edición.
- Operaciones críticas en transacción.
- Regresión de Torta de nata en arranque.
