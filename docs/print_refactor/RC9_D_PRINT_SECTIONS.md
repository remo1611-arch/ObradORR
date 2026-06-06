# RC9-E · Secciones imprimibles y contrato documental

## Objetivo

Separar el render de impresión en una capa explícita de secciones documentales sin sustituir todavía el motor clásico ni cambiar la salida visual profunda.

## Cambio aplicado

Se añade `app/js/print/print-sections.js`, una capa clásica compatible con Android/Termux que define:

- contrato de secciones imprimibles;
- plan de impresión por tipo de documento;
- render orquestado por adaptadores;
- fallback al render clásico si la capa no está disponible.

## Flujo RC9-E

```text
Sesión actual
↓
buildPrintDocumentModel()
↓
ObradORRPrintSections.buildPlan(model)
↓
ObradORRPrintSections.renderDocumentBody(model, adapters)
↓
printDocumentShell()
↓
visor clásico iframe srcdoc
```

## Estado

Esta fase no introduce `print-view.html`. Mantiene el visor clásico y prepara la transición segura para RC9-E.

## Límites

No se modifican recetas, ingredientes, SQLite, APPCC, costes ni el CSS profundo de impresión.
