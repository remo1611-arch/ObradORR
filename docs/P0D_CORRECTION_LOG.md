# P0-D · APPCC docente mínimo estructurado

Fase aplicada sobre `ObradORR_1_0_0_RC1_P0C_ALERGENOS_IMPRESION.zip`.

## Alcance

- Se crea `appcc_doc_blocks` como estructura mínima de APPCC docente por ficha activa.
- Se añade `v_appcc_doc_blocks_print` para revisión/imprenta.
- Se modifica el motor JS de impresión para mostrar APPCC docente mínimo como tabla.
- No se convierte ObradORR en un sistema APPCC industrial.
- No se inventan límites críticos legales.
- Se usan expresiones verificables: `según manual APPCC del centro`, `según ficha técnica/proveedor` y `recomendación técnica docente` cuando procede.

## Campos

- `risk_family`
- `hazard_type`
- `main_hazard`
- `preventive_measure`
- `monitoring`
- `corrective_action`
- `record_reference`
- `service_conservation`
- `source_type`

## Estado

La estructura queda como modelo docente mínimo e imprimible. La revisión técnica fina por receta queda para fases posteriores o para validación del centro.
