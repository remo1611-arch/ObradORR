# RC18 · Corrección de opciones de impresión

## Diagnóstico

La prueba de PDFs RC17 mostró que los perfiles `Aula-taller`, `Docente producción` y `Auditoría completa` diferenciaban correctamente la densidad documental, pero las opciones manuales de **costes** y **APPCC** podían quedar anuladas por el perfil efectivo.

## Decisión técnica

- Perfil = valores por defecto.
- Checks = sobrescritura manual del perfil.
- APPCC desmarcado no elimina toda referencia sanitaria: conserva aviso mínimo de seguridad documental.

## Implementación

- `effectivePrintOptions()` ya no fuerza `includeCosts` ni `includeAppcc` por perfil cuando el usuario ha marcado/desmarcado el check.
- Se añade `profileOptionDefaults()` como matriz de valores iniciales por perfil.
- Se añade `boolOption()` para distinguir booleanos explícitos de valores ausentes.
- Se añade `appccPrintHtml()`:
  - si `includeAppcc=true`, imprime el bloque APPCC existente;
  - si `includeAppcc=false`, imprime `minimalSafetyNoticeHtml()`.
- Se actualizan etiquetas de UI para reducir ambigüedad.

## Validación esperada

En una misma selección:

1. `Aula-taller + Mostrar costes` debe mostrar columna `Coste` y totales.
2. `Docente producción - Mostrar costes` debe ocultar columna `Coste` y totales.
3. `Auditoría completa - Mostrar APPCC docente` debe ocultar las tablas APPCC y conservar aviso mínimo.
4. `Aula-taller + Mostrar APPCC docente` debe mostrar APPCC breve.

