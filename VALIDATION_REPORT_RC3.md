# Validación RC3

Validación prevista para `2.0.0-rc3.1-hotfix-maquetacion`:

- `node --check` sobre todos los JS.
- `SQLite integrity_check`.
- `SQLite foreign_key_check`.
- `validate_release.py`.
- Comprobación de fichas activas sin `release_status='validada'`.
- Comprobación de `yield_status='pending'` en panadería activa.
- Comprobación de Quiche sin masa quebrada dulce real.
- Comprobación de utilidades `getIsoTimestampForFilename`, `spanishLongDate`, `printDocumentFilenameBase`.
- Comprobación de CSS/HTML de imagen de cabecera con `object-fit: contain`.

No se ha realizado validación visual real desde el equipo del usuario; debe probarse PDF en navegador.
