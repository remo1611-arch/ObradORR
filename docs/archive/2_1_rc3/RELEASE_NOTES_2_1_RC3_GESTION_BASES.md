# ObradORR 2.1.0-RC7 · Validación de obrador y gestión de bases

Versión candidata no publicada. Parte de ObradORR 2.1.0-RC1 y corrige la validación de obrador antes de añadir gestión segura de bases.

## Cambios principales

- Corrección de `yield_status` en panadería/pastelería:
  - `validada` → `validated`
  - `probada_con_ajustes` → `tested`
  - `no_validada` / `requiere_revision` → `pending`
- Alineación de `migrations.js` con 2.1.0.
- Homogeneización de `app_meta.version`, `app_version`, `schema_version`, `release_tag` y `cache_tag`.
- Limpieza del duplicado de recogida de datos de validación.
- Nueva gestión de bases en Sistema:
  - usar base incluida en la aplicación;
  - crear base nueva limpia;
  - restaurar SQLite sustituyendo;
  - importar y combinar SQLite;
  - validar base activa.
- Inclusión de `db/obradorr_blank.sqlite` como plantilla limpia compatible.

## Política de validación

Ninguna ficha nace validada. La validación real exige registro de prueba de obrador con fecha, responsable y resultado en `workshop_validation_log`.

## Límites

Esta versión es RC. Debe probarse en navegador real antes de publicarse como 2.1.0 final.
