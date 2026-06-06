# RC9-E · print-view.html independiente

## Objetivo

Separar la interfaz de trabajo de ObradORR del documento imprimible mediante una vista independiente (`app/print-view.html`).

## Flujo aplicado

```text
Sesión actual
↓
generateDocument()
↓
buildPrintDocumentModel()
↓
ObradORRPrintSections.renderDocumentBody()
↓
printDocumentShell()
↓
createPrintViewPayload()
↓
localStorage temporal
↓
app/print-view.html?doc=...
```

## Comportamiento

- La app intenta abrir una pestaña independiente de impresión.
- Si el navegador bloquea la pestaña, muestra un botón para abrirla manualmente.
- El visor integrado con `iframe srcdoc` se conserva como respaldo.
- No se cambia el CSS profundo del documento.
- No se cambia SQLite ni el modelo gastronómico.

## Persistencia temporal

El documento imprimible se guarda temporalmente en `localStorage` con clave `ObradORRPrintView:<id>` y caducidad aproximada de 6 horas.

## Límite de esta fase

RC9-E separa la vista de impresión, pero todavía no refactoriza el CSS de impresión ni modifica la maquetación profunda de fichas, pedido de producción, subelaboraciones o panadería.
