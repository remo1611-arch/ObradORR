# RELEASE_NOTES_RC18 · ObradORR 1.0.0-rc.18

## Objetivo

RC18 corrige la interacción entre **perfil de salida** y opciones manuales de impresión.

Hasta RC17, el perfil podía imponer internamente los valores de costes y APPCC, de modo que marcar o desmarcar los checks no siempre modificaba el PDF dentro del mismo perfil.

## Cambios aplicados

- El perfil de salida pasa a actuar como **preajuste inicial**.
- El check **Mostrar costes** sobrescribe el perfil en la exportación:
  - muestra u oculta columna `Coste`;
  - muestra u oculta coste estimado;
  - muestra u oculta coste de subelaboraciones;
  - muestra u oculta coste en pedido consolidado.
- El check **Mostrar APPCC docente** sobrescribe el perfil en la exportación:
  - marcado: imprime APPCC breve o completo según perfil;
  - desmarcado: oculta el bloque APPCC tabular y conserva una nota mínima de seguridad documental.
- Se renombran las etiquetas de UI:
  - `Incluir costes` → `Mostrar costes`;
  - `Incluir APPCC` → `Mostrar APPCC docente`.
- Se mantiene la política documental: las fichas siguen como propuestas docentes pendientes de prueba real de obrador.

## Alcance

RC18 no reformula fichas, no valida recetas y no cambia escandallos gastronómicos. Es una corrección funcional de renderizado/exportación.
