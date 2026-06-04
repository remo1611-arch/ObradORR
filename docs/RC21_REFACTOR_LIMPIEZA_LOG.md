# RC21 · Refactorización conservadora y limpieza documental

## Objetivo

Aplicar una limpieza técnica después de RC20 sin rehacer la app ni alterar la base gastronómica.

## Hecho

- Eliminadas funciones internas no usadas: `shouldFoldTechnicalSubrecipe`, `recipeSteps`, `markDataChanged`, `displayRecipeCategory`.
- `generateDocument()` queda reducido a orquestador.
- Añadidas funciones de separación:
  - `buildPrintDocumentModel()`
  - `renderPrintDocumentModel()`
- Neutralizada la clase de avisos documentales: `document-status-warning`.
- Añadidas secciones internas en código de impresión.
- Actualizado `PRINT_MODEL.md`.
- Añadido `PRINT_PROFILES.md`.
- Reescrito `CHANGELOG.md`.
- Reorganizadas notas históricas y validaciones en subcarpetas documentales.

## No hecho

- No se modifica ninguna fórmula.
- No se cambia ningún rendimiento.
- No se marca ninguna ficha como validada.
- No se cambia la política de validación docente.
- No se introduce todavía un sistema modular ES para evitar regresiones en Android/Termux.

## Riesgo residual

La estructura de `obradorr-app.js` sigue siendo monolítica por compatibilidad. La separación completa por módulos queda para 1.1/2.0.
