# ObradORR 2.1.0-RC9-A · Auditoría del sistema de impresión

## Estado

Fase de análisis sin cambios funcionales sobre la base `ObradORR 2.1.0-RC8 · Release Candidate`.

No se han modificado:

- `db/obradorr.sqlite`
- `db/obradorr_blank.sqlite`
- recetas, ingredientes, APPCC, alérgenos, costes ni sesiones
- motor recursivo
- exportaciones
- edición segura
- flujo de copias SQLite

## Objetivo de RC9-A

Levantar un mapa técnico del sistema de impresión actual antes de refactorizarlo. La fase no pretende cambiar el PDF, sino identificar qué existe, dónde está, qué riesgos tiene y cómo debe dividirse en la siguiente fase.

## Flujo actual de impresión

El flujo actual parte de la pestaña `Sesión actual` y sigue esta cadena:

```text
Sesión actual
↓
printWorkspaceView()
↓
generateDocument(items, opts)
↓
buildPrintDocumentModel(items, opts)
↓
renderPrintDocumentModel(model)
↓
recipeSheetHtml() / orderHtml()
↓
printDocumentShell()
↓
presentPrintDocument()
↓
iframe srcdoc + window.print()
```

## Mapa de funciones principales

| Función | Archivo | Línea aproximada | Responsabilidad actual | Riesgo |
|---|---|---:|---|---|
| `printWorkspaceView()` | `app/js/obradorr-app-classic.js` | 479 | UI de `Sesión actual`: documento, perfil, selección, datos docentes y botones | Medio: mezcla UI de trabajo con opciones documentales |
| `documentProfileRadiosHtml()` | `app/js/obradorr-app-classic.js` | 683 | Renderiza perfiles documentales actuales | Alto: nombres por ciclo/etapa; conviene sustituir por finalidad documental |
| `sheetOptionsHtml()` | `app/js/obradorr-app-classic.js` | 797 | Opciones avanzadas: costes, subelaboraciones, proceso y APPCC | Medio: opciones sueltas pueden entrar en conflicto con perfiles |
| `generateDocument()` | `app/js/obradorr-app-classic.js` | 2397 | Orquestador general de impresión | Bajo/medio: buen punto de entrada para refactor incremental |
| `buildPrintDocumentModel()` | `app/js/obradorr-app-classic.js` | 2407 | Construye modelo preliminar con opciones, contexto, preflight y normalización | Medio: ya existe modelo, pero el render aún depende mucho de funciones clásicas |
| `renderPrintDocumentModel()` | `app/js/obradorr-app-classic.js` | 2434 | Decide qué secciones se imprimen: cabecera, preflight, índice, fichas y pedido | Alto: mezcla selección de secciones con render HTML directo |
| `recordPrintJob()` | `app/js/obradorr-app-classic.js` | 2448 | Registra trabajos de impresión en SQLite | Bajo: útil y conservable |
| `presentPrintDocument()` | `app/js/obradorr-app-classic.js` | 2484 | Abre modal con iframe `srcdoc` y llama a impresión | Alto: no es todavía `print-view.html`; la salida sigue ligada a la app principal |
| `recipeSheetHtml()` | `app/js/obradorr-app-classic.js` | 2635 | Enruta ficha culinaria o panadera | Bajo/medio: punto natural para separar renderer por tipo |
| `culinarySheetHtml()` | `app/js/obradorr-app-classic.js` | 2642 | Renderiza ficha culinaria | Medio: contiene ingredientes, proceso, subrecetas, alérgenos, APPCC y costes |
| `bakerySheetHtml()` | `app/js/obradorr-app-classic.js` | 2871 | Renderiza ficha panadera/pastelera técnica | Alto: panadería requiere secciones propias estables |
| `bakeryFormulaBlocks()` | `app/js/obradorr-app-classic.js` | 2926 | Calcula bloques panaderos | Alto: crítico para prefermento/masa final/acabados |
| `appccPrintHtml()` | `app/js/obradorr-app-classic.js` | 3412 | Decide APPCC estructurado, mínimo o no mostrado | Medio: debe depender del modelo documental, no solo de checks |
| `linesTable()` | `app/js/obradorr-app-classic.js` | 3415 | Tabla de ingredientes con/sin costes | Medio: columna de coste debería obedecer al modelo documental |
| `orderHtml()` | `app/js/obradorr-app-classic.js` | 3446 | Renderiza pedido consolidado | Alto: debe renombrarse y estabilizarse como `Pedido de producción` |
| `orderLinesForItem()` | `app/js/obradorr-app-classic.js` | 3467 | Genera líneas para pedido con subrecetas/componentes | Alto: riesgo de duplicado/omisión si se toca sin pruebas |
| `aggregateOrder()` | `app/js/obradorr-app-classic.js` | 3513 | Agrupa líneas de pedido por ingrediente/unidad/grupo | Alto: núcleo del pedido consolidado |
| `printDocumentShell()` | `app/js/obradorr-app-classic.js` | 3538 | HTML completo + CSS inline de impresión | Muy alto: CSS y estructura están embebidos en JS; difícil mantener/regresar |
| `printSession()` | `app/js/obradorr-app-classic.js` | 3602 | Imprime una sesión guardada | Medio: debe seguir compatible con modelos nuevos |

## Archivos actuales implicados

| Archivo | Papel actual | Observación |
|---|---|---|
| `app/js/obradorr-app-classic.js` | Motor principal clásico de UI, impresión, edición y sesiones | El bloque de impresión sigue demasiado concentrado aquí |
| `app/js/domain/document-profiles.js` | Perfiles documentales actuales | Debe migrar a modelos neutrales por finalidad |
| `app/js/domain/document-model.js` | Modelo normalizado preliminar | Buen punto de partida, pero no gobierna todavía todo el render |
| `app/js/domain/recursive-engine.js` | Consolidación recursiva de pedido, alérgenos y subrecetas | Debe mantenerse como motor de datos, no como renderer |
| `app/js/export/export-tools.js` | Exportaciones externas y HTML imprimible básico de práctica | No debe mezclarse con el nuevo sistema de impresión principal |
| `app/css/obradorr.css` | CSS general de app y vista previa | La impresión principal usa además CSS inline dentro de JS |
| `app/js/print/README.md` | Carpeta reservada para separación progresiva | Está lista para alojar la nueva arquitectura |

## Perfiles actuales detectados

En `app/js/domain/document-profiles.js` existen estos perfiles:

| ID actual | Etiqueta actual | Problema para RC9 |
|---|---|---|
| `aula_taller` | Aula-taller alumnado | Puede conservarse conceptualmente, pero el nombre debería orientarse a finalidad |
| `fpb` | FPB · guía práctica | No recomendable como etiqueta visible por nivel |
| `cm` | CM · ficha técnica | No recomendable como etiqueta visible por nivel |
| `gs` | GS · producción y costes | No recomendable como etiqueta visible por nivel |
| `docente_produccion` | Docente producción | Aceptable, pero puede integrarse en modelo completo |
| `auditoria_completa` | Auditoría documental | Útil como modelo interno avanzado |
| `pedido` | Pedido / economato | Debe transformarse en `Pedido de producción` |

## Modelos documentales objetivo

La nueva impresión debe evitar etiquetas por nivel educativo y usar modelos por finalidad:

| Modelo objetivo | Finalidad | Costes/escandallo | APPCC | Subelaboraciones |
|---|---|---:|---|---|
| `ficha_trabajo` | Ficha limpia de ejecución de obrador | No | Seguridad mínima / alérgenos | No desarrollar o resumen mínimo |
| `ficha_tecnica` | Ficha ordinaria de aula-taller | No | Breve/intermedia | Resumen o ingredientes |
| `ficha_tecnica_ampliada` | Documento técnico para producción guiada | Opcional | Completo docente | Desarrolladas según opción |
| `dossier_produccion` | Documento completo con escandallo y trazabilidad | Sí | Completo | Completas |
| `pedido_produccion` | Ingredientes consolidados de la sesión | Opcional según modelo | No aplica o resumen | Siempre consolidado para pedido |

## Terminología recomendada

Sustituir progresivamente:

```text
Pedido → Pedido de producción
Fichas + pedido → Fichas + pedido de producción
Nivel documental → Modelo de ficha
FPB / CM / GS → Ficha de trabajo / Ficha técnica / Ficha técnica ampliada / Dossier completo de producción
```

## Riesgos técnicos principales

1. **CSS de impresión incrustado en JS**  
   `printDocumentShell()` contiene estructura y CSS extensos. Esto dificulta mantenimiento, pruebas visuales y regresión.

2. **Modelo intermedio incompleto**  
   `buildPrintDocumentModel()` ya existe, pero el renderer todavía consulta funciones y estado globales. La normalización no domina aún el documento.

3. **Perfil, documento y opciones mezclados**  
   `documentType`, `documentProfile`, `includeCosts`, `includeAppcc`, `includeProcess` y `subrecipeMode` conviven sin una matriz única de decisión.

4. **Subelaboraciones sensibles**  
   El modo `none | ingredients | sheets` debe afectar a ficha, coste, pedido, alérgenos y subfichas de forma coherente.

5. **Panadería y componentes**  
   Prefermentos, masa final, acabados, componentes panaderos y rendimientos no deben caer en una ficha culinaria genérica.

6. **`Pedido` todavía ambiguo**  
   Debe estabilizarse como `Pedido de producción` para evitar confusión con pedido a proveedor, compra o economato.

7. **Vista previa ligada a modal/iframe srcdoc**  
   Funciona, pero no es la opción B definitiva. `print-view.html` permitiría aislar impresión de la interfaz.

## Decisiones de RC9-A

- No refactorizar todavía el motor.
- No alterar salida PDF.
- No cambiar datos ni SQLite.
- Usar `app/js/print/` como destino de extracción gradual.
- Crear primero una capa de modelos neutros antes de tocar CSS.
- Mantener compatibilidad con `generateDocument()` durante la transición.

## Próxima fase recomendada

**RC9-B · Modelo intermedio y nombres neutrales sin cambio visual profundo**

Objetivos:

1. Crear `app/js/print/print-models.js` con modelos neutrales.
2. Crear `app/js/print/print-options-resolver.js` para resolver tipo de documento + modelo + opciones.
3. Mantener `generateDocument()` como entrada pública.
4. Cambiar textos visibles de `Pedido` a `Pedido de producción`.
5. Ocultar etiquetas por nivel educativo en la UI.
6. Mantener render clásico de momento, pero alimentado por una configuración más clara.
7. Añadir validación de nombres/modelos a `tools/validate_release.py`.

## Criterio de aceptación para RC9-B

- La app arranca igual que RC8.
- La impresión sigue funcionando.
- No cambia SQLite.
- El usuario ve modelos neutrales.
- `Pedido` aparece como `Pedido de producción`.
- No aparecen etiquetas visibles `FPB`, `CM` ni `GS` como modelos de impresión.
- El código dispone ya de una matriz clara de modelos para futuras fases.
