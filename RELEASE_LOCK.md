# ObradORR 2.0.0 · Public GitHub Release

Estado: **congelada para publicación**.

Fecha de cierre: 2026-06-05.

Esta versión queda cerrada como **ObradORR 2.0.0**. A partir de este punto no se añaden funciones nuevas sobre esta rama. Solo se admitirían correcciones de bug real comprobado.

## Identificadores técnicos

- `app_version`: `2.0.0`
- `release_tag`: `2.0.0-stable`
- `cache_tag`: `obradorr-200-public-release-final-ui-hints`
- IndexedDB principal: `obradorr-data-200-public-release-final-ui-hints`

## Alcance funcional congelado

- Aplicación web offline/local con SQLite WASM.
- Catálogo de elaboraciones, ingredientes, alérgenos y documentación docente.
- Perfiles documentales e impresión/exportación.
- Pedido consolidado con motor recursivo.
- Escalado de producción:
  - fichas ordinarias por raciones/rendimiento;
  - formulación por piezas + peso unitario, masa total o harina total.
- Backup SQLite/JSON/ZIP.
- Importación segura combinada sin sobrescritura directa.
- Persistencia local con IndexedDB y snapshots rotatorios.
- Control de duplicados de ingredientes y elaboraciones.

## Límites mantenidos

- Ninguna ficha queda validada por IA.
- `release_status` se mantiene como `pendiente` salvo fichas no aptas justificadas.
- `yield_status` panadero se mantiene `pending` salvo prueba real de obrador.
- La validación real de rendimiento, merma, peso cocido y aceptación organoléptica corresponde al profesorado en obrador.

## Regla de evolución

- Rama 2.0.0: congelada.
- Bugs reales: hotfix 2.0.x.
- Limpieza interna/refactor: rama 2.1-dev.
- Cambios de arquitectura mayor: futura 3.0.
