# Contrato de vista de impresión · RC9-E

## Entrada

`print-view.html` recibe el identificador temporal por URL:

```text
app/print-view.html?doc=PV-...
```

## Almacenamiento

La app principal guarda el documento en:

```text
localStorage["ObradORRPrintView:" + docId]
```

## Payload mínimo

```json
{
  "schema": "ObradORRPrintView/2.1-rc9-e",
  "title": "...",
  "filenameBase": "...",
  "suggestedTitle": "...",
  "html": "<!doctype html>...",
  "createdAt": "...",
  "expiresAt": 0
}
```

## Fallback

Si falla `localStorage`, si el navegador bloquea la pestaña o si `print-view.html` no puede abrirse, ObradORR mantiene el visor integrado anterior.
