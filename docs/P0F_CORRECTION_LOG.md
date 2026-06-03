# P0-F · Persistencia, autoguardado, importación y reset

Fecha: 2026-06-03T19:04:08.833747Z

## Alcance
Corrección quirúrgica de seguridad funcional de datos locales. No modifica datos gastronómicos, alérgenos, APPCC, pedido ni versionado final.

## Cambios
- Banner visible de guardado y recuperación local.
- Protección `beforeunload` si hay cambios pendientes o autoguardado en curso.
- `idbPut` ya no falla silenciosamente cuando IndexedDB no está disponible.
- Estado explícito de guardado: guardando, guardado, pendiente, error, copia descargada, base pública restaurada e importación correcta.
- Importación y restauración con confirmación reforzada y recomendación de copia previa.
- Reset local con casilla de confirmación, confirmación final y explicación de qué se borra.
- Diagnóstico ampliado: IndexedDB, localStorage, revisiones de guardado/descarga y metadato P0-F.

## Fuera de alcance
P0-G prueba real Windows/Termux y P0-H versionado final RC1.
