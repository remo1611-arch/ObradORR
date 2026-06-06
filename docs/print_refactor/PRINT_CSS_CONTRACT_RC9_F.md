# Contrato CSS de impresión · RC9-F

## Archivo principal

`app/css/print-document.css`

## Entrada desde JS

`printDocumentShell(content, title)` debe generar un documento HTML con:

```html
<base href=".../app/">
<link rel="stylesheet" href="css/print-document.css?v=obradorr-210-rc9-f-print-css">
```

## Compatibilidad

La hoja CSS debe funcionar en:

- `app/print-view.html` mediante iframe `srcdoc`.
- visor integrado de respaldo.
- documentos auxiliares generados con `printDocumentShell()`.

## Regla de mantenimiento

Los cambios de maquetación impresa deben entrar en `print-document.css`, no como bloques CSS largos embebidos dentro de `obradorr-app-classic.js`.
