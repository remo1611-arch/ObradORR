# MIGRATIONS · ObradORR experimental

Se añade una infraestructura mínima y no destructiva:

- `migrations_log` si no existe.
- registro `20260604_experimental_allinone_infra`.
- no se aplican migraciones destructivas.
- no se migra `culinary_recipes` ↔ `bakery_recipes`.

## Política futura
1. Backup antes de migrar.
2. Validación pre-migración.
3. Migración incremental.
4. Validación post-migración.
5. Rollback documentado.

En esta rama solo se prepara infraestructura.
