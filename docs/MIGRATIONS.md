# MIGRATIONS · ObradORR 1.0.0-rc.3

La versión incluye tabla `schema_migrations` y metadatos `app_meta` actualizados a `1.0.0-rc.3`.

## Política

- Las copias de trabajo deben pertenecer a ObradORR.
- Deben coincidir `release_tag` y `cache_tag` con `obradorr-100-rc3`.
- Si una copia no coincide, la app la bloquea para evitar corrupción silenciosa.
- Futuras migraciones deben ser idempotentes y registrarse en `schema_migrations`.

## Decisión 2.0

Se prioriza seguridad de aula frente a importación indiscriminada de bases antiguas. Para migrar bases anteriores conviene crear una utilidad específica y validarla caso por caso.
