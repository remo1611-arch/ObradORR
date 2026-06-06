# RC9-C · Resolución de opciones y matriz de bloques imprimibles

## Objetivo

Esta fase formaliza la relación entre tres decisiones independientes del sistema de impresión:

1. **Tipo de documento**: `Fichas`, `Pedido de producción`, `Fichas + pedido de producción`.
2. **Modelo de ficha**: `Ficha de trabajo`, `Ficha técnica`, `Ficha técnica ampliada`, `Dossier completo de producción`.
3. **Ajustes avanzados del modelo**: costes, APPCC, proceso y subelaboraciones.

No se modifica la base SQLite ni se cambia todavía el mecanismo de render final. El objetivo es preparar una transición segura hacia `print-view.html` en fases posteriores.

## Matriz documental

| Bloque | Ficha de trabajo | Ficha técnica | Ficha técnica ampliada | Dossier completo de producción |
|---|---|---|---|---|
| Foto | Incluida si existe | Incluida si existe | Incluida si existe | Incluida si existe |
| Ingredientes y cantidades | Sí | Sí | Sí | Sí |
| Proceso | Sí | Sí | Sí | Sí |
| Alérgenos | Sí | Sí | Sí | Sí |
| Equipamiento | No | Sí | Sí | Sí |
| Conservación / servicio | No | Sí | Sí | Sí |
| APPCC docente | No | Breve / según ajuste | Sí | Sí |
| Subelaboraciones | No desarrollar | Ingredientes | Subfichas | Subfichas completas |
| Costes | No | No | Opcional | Sí |
| Escandallo | No | No | Opcional | Sí |
| Validación documental | No | No | Opcional | Sí |
| Trazabilidad técnica | No | No | No | Sí |
| Pedido de producción | Opcional según tipo de documento | Sí si se solicita | Sí si se solicita | Sí si se solicita |

## Implementación

La matriz queda declarada en:

```text
app/js/domain/document-profiles.js
```

Funciones relevantes:

```text
ObradORRDocumentProfiles.resolve(profile, documentType, overrides)
ObradORRDocumentProfiles.blockSummary(profile, documentType, overrides)
ObradORRDocumentProfiles.modelBlocks(profile, documentType)
```

`effectivePrintOptions()` incorpora ahora `printBlocks` y `printConfig`, sin alterar el render clásico.

## Criterio de aceptación

- La interfaz muestra el modelo y sus bloques imprimibles antes de generar PDF.
- Los ajustes avanzados se presentan como sobrescrituras puntuales del modelo.
- `Pedido` queda nombrado como `Pedido de producción`.
- No aparecen etiquetas por ciclo ni nivel del alumnado.
- No se toca SQLite.
- El render clásico sigue funcionando.
