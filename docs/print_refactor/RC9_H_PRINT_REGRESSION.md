# RC9 · Pruebas de regresión documental y cierre de impresión

## Objetivo

Cerrar la refactorización de impresión iniciada en RC9-A verificando que los modelos documentales neutrales, la vista independiente `print-view.html`, el CSS externo de impresión y la matriz de bloques imprimibles conviven sin romper la salida documental existente.

Esta fase no modifica la base SQLite ni los datos gastronómicos. Su finalidad es consolidar la impresión como arquitectura documental estable para prueba docente.

## Alcance validado

Se mantiene el flujo:

```text
Sesión actual
→ modelo documental
→ matriz de bloques imprimibles
→ secciones imprimibles
→ HTML imprimible
→ print-view.html
→ imprimir / guardar PDF
```

Con respaldo conservado:

```text
Abrir vista independiente
```

## Modelos revisados

| Modelo | Finalidad | Bloques esperados |
|---|---|---|
| Ficha de trabajo | Documento operativo de aula-taller | foto si existe, ingredientes, cantidades, proceso, alérgenos básicos |
| Ficha técnica | Práctica técnica ordinaria | ficha de trabajo + conservación/servicio, APPCC breve y subelaboraciones resumidas |
| Ficha técnica ampliada | Producción docente avanzada | APPCC completo, subelaboraciones desarrolladas, validación opcional y costes opcionales |
| Dossier completo de producción | Documento interno completo | escandallo, costes, trazabilidad, validación documental y subfichas completas |

## Regresiones controladas

- Las etiquetas visibles por ciclo (`FPB`, `CM`, `GS`) no deben aparecer como modelos de impresión.
- `Pedido` queda normalizado como `Pedido de producción`.
- `print-view.html` debe estar disponible.
- El visor integrado permanece como fallback.
- `print-document.css` debe estar separado del JS.
- El shell de impresión no debe volver a incrustar el bloque largo `@page`.
- Las subelaboraciones deben resolverse mediante `subrecipeMode`.
- El escandallo solo debe aparecer cuando el modelo lo permita.
- La trazabilidad técnica queda reservada para el dossier completo o modelos ampliados.

## Límites

Esta validación es automática y estructural. No sustituye una prueba visual final en navegador real con PDF generado desde Chrome/Edge/Android.

Prueba manual recomendada antes de publicar como `PUBLIC RELEASE`:

1. Abrir desde servidor local.
2. Resetear datos locales.
3. Añadir una elaboración culinaria simple a sesión actual.
4. Generar `Ficha de trabajo`.
5. Generar `Ficha técnica`.
6. Generar `Ficha técnica ampliada`.
7. Generar `Dossier completo de producción`.
8. Generar `Pedido de producción`.
9. Repetir con una elaboración panadera.
10. Confirmar que no aparecen botones ni interfaz de trabajo en PDF.

## Resultado

RC9 queda como candidata técnica de cierre para impresión. Si la prueba visual manual es correcta, puede elevarse a `ObradORR 2.1.0-RC9 Release Candidate` o integrarse en la siguiente release pública.
