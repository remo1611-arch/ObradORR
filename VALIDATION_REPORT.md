# VALIDATION_REPORT · RC experimental

La validación técnica se genera también en `docs/validation/EXPERIMENTAL_VALIDATE_RELEASE_OUTPUT.txt`.

Validaciones previstas:
- `node --check` en JS;
- SQLite integrity_check;
- foreign_key_check;
- manifest SHA interno;
- fichas activas validada = 0;
- creación nueva = pendiente;
- bakery yield_status = pending;
- presencia de módulos experimentales;
- preflight/document profiles/safe editor/migrations.

Límite: no se puede certificar impresión visual real sin navegador del usuario.
