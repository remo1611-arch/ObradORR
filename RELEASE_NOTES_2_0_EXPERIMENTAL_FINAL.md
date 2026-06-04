# ObradORR 2.0.0-rc2-backup-import-export

Rama **experimental final all-in-one** construida sobre `ObradORR_1_1_0_EXPERIMENTAL_HOTFIX1`.

RC28-STABLE-CANDIDATE sigue siendo la candidata estable docente. Esta rama no la sustituye hasta prueba real en navegador/PDF.

## Cambios de alcance alto

- Motor recursivo 2.0 usado como fuente principal del pedido consolidado.
- Soporte recursivo para ingredientes directos, subrecetas culinarias, componentes panaderos obligatorios y alérgenos derivados.
- Perfiles documentales consolidados: FPB, CM, GS, docente, aula-taller, pedido y auditoría.
- Preflight 2.0 con reglas por perfil y sin lectura histórica residual para Quiche.
- Migración no destructiva: `documentary_status`, `workshop_validation_status` y `workshop_validation_log`.
- Editor seguro reforzado con confirmación de cambios de impacto.
- Impresión con índice para perfiles no compactos y pedido indicando fuente de cálculo.

## Límites deliberados

- No se migra `culinary_recipes` ↔ `bakery_recipes`.
- No se valida ninguna ficha.
- No se inventan rendimientos, mermas, pesos cocidos ni validaciones sensoriales.
- No se sustituye SQLite ni se migra a servidor/framework.
- No se rehace por completo el motor PDF editorial para no romper la estabilidad de impresión del navegador.
