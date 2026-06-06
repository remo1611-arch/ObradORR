# RC9-B · Modelos neutrales de impresión

## Decisión aplicada

Los antiguos perfiles visibles asociados a niveles o ciclos dejan de mostrarse en la interfaz de impresión. La selección se formula ahora por finalidad documental.

## Modelos

| Modelo | Finalidad | Costes | APPCC | Subelaboraciones | Uso recomendado |
|---|---|---:|---:|---|---|
| Ficha de trabajo | Documento limpio y operativo | No | No detallado | No desarrollar | Ejecución guiada en aula-taller |
| Ficha técnica | Práctica ordinaria | No | Sí | Ingredientes desglosados | Prácticas con lectura técnica |
| Ficha técnica ampliada | Producción docente | Opcional | Sí completo | Subfichas | Prácticas complejas o de consolidación |
| Dossier completo de producción | Gestión/auditoría | Sí | Sí completo | Subfichas y trazabilidad | Profesorado, auditoría o control de producción |

## Alias internos conservados

Para no romper preferencias guardadas, los identificadores antiguos se traducen automáticamente:

| Identificador antiguo | Modelo nuevo |
|---|---|
| `aula_taller` | `ficha_trabajo` |
| `fpb` | `ficha_trabajo` |
| `cm` | `ficha_tecnica` |
| `gs` | `dossier_completo` |
| `docente_produccion` | `ficha_ampliada` |
| `auditoria_completa` | `dossier_completo` |

## Alcance técnico

Esta fase mantiene el render clásico y el iframe actual. No introduce `print-view.html`; eso queda para una fase posterior.
