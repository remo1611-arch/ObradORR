# ObradORR 1.0.0 RC28-STABLE-CANDIDATE / RC1 docente

Fecha de cierre: 2026-06-04T17:54:20Z

## Naturaleza de la versión

RC28-STABLE-CANDIDATE cierra la primera versión docente de ObradORR a partir de RC27-DATA5-7.

No es una nueva fase de corrección gastronómica. Es un cierre de paquete, metadatos, documentación y validación técnica para poder probar la aplicación de forma estable en Windows, Termux y generación de PDF desde navegador.

## Cambios realizados

- Actualización coherente de `app_meta`, `VERSION.txt`, constantes de versión, `cache_tag` e IndexedDB local.
- Añadida documentación de cierre: límites, validación, guías de prueba, matriz de aceptación y hoja DATA8.
- Regenerado manifiesto público SHA256.
- Validación técnica de SQLite, JavaScript, estados documentales, creación de fichas nuevas y trazabilidad heredada RC22-RC27.

## Cambios no realizados

- No se modifican fórmulas.
- No se modifican procesos gastronómicos.
- No se modifican rendimientos.
- No se modifica motor de impresión.
- No se migran fichas entre `culinary_recipes` y `bakery_recipes`.
- No se marca ninguna ficha como `validada`.

## Política documental

Todas las fichas son propuestas técnicas documentales contrastadas y pendientes de prueba real por profesorado en obrador. El estado `validada` queda reservado exclusivamente a fichas probadas, medidas y aceptadas por el profesorado.

## Siguiente fase

1. Prueba real de RC28 en Windows/Termux.
2. Generación de PDFs representativos.
3. Hotfix RC28.1 solo si aparece bug real.
4. Inicio de DATA8 para pruebas de obrador y rendimientos medidos.
