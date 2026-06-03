# P0-G2 + P0-H · Fotos responsive y versionado RC1

Fecha: 2026-06-03

## Alcance

Aplicada corrección visual final sobre fotos de vista previa/documento y cierre de versionado como `ObradORR 1.0.0-rc.1`.

## Cambios P0-G2

- Ajustada la foto de ficha en vista previa para que no domine el contenido técnico.
- Añadidas clases `sheet-photo` y `sub-sheet-photo` en cabeceras de ficha y subficha.
- Añadidos estilos responsive para vista previa/modal y documento imprimible.
- Uso de `object-fit: contain` para evitar deformación o recorte agresivo.
- Eliminado hueco extraño cuando no hay foto mediante clases `has-photo` / `no-photo`.

## Cambios P0-H

- `VERSION.txt`: `1.0.0-rc.1`.
- `app_meta.app_version`: `1.0.0-rc.1`.
- `app_meta.release_tag`: `rc1`.
- `app_meta.cache_tag`: `obradorr-100-rc1`.
- `release_channel`: `release-candidate`.
- HTML/JS/cache tags actualizados a `obradorr-100-rc1`.
- IndexedDB principal actualizado a `obradorr-data-100-rc1`.

## Validación

- `python tools/validate_release.py .`: OK.
- `node --check app/js/obradorr-app-classic.js`: OK.
- `node --check app/js/obradorr-app.js`: OK.
- `PRAGMA integrity_check`: OK.
- `PRAGMA foreign_key_check`: 0 errores.

## Estado

Release candidate generada. No es versión estable final.
