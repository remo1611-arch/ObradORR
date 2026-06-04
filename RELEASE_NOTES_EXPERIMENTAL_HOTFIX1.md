# ObradORR 2.0.0-rc2-backup-import-export

Rama experimental HOTFIX1 sobre `2.0.0-rc2-backup-import-export-allinone`. RC28-STABLE-CANDIDATE permanece intacta y sigue siendo la candidata estable docente.

## Alcance

- Corrección del falso crítico `QUICHE_MASA_DULCE`: la regla ya no usa notas históricas o textos residuales; evalúa líneas/subrecetas activas reales.
- Política de preflight por perfil:
  - FPB: resumen breve.
  - CM: resumen + críticos.
  - GS/docente: críticos y altos.
  - Pedido: resumen si hay críticos/altos.
  - Auditoría: tabla completa.
- Compactación de perfiles FPB/CM/GS mediante defaults declarativos.
- Aviso de fichas pendientes agregado como aviso global, no repetido ficha a ficha.

## Fuera de alcance

No se cambian fórmulas, rendimientos, motor SQLite principal, impresión editorial completa, ni se migran tablas `culinary_recipes` / `bakery_recipes`.
