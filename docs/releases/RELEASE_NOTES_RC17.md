# ObradORR 1.0.0-rc.18

## Objetivo de la versión

RC18 introduce la primera capa de **salida documental por perfiles**. No cambia la política de validación de fichas: las elaboraciones siguen siendo propuestas docentes contrastables y pendientes de prueba real de obrador salvo validación posterior documentada por el profesorado.

## Cambios principales

- Nuevo selector de perfil de salida:
  - Aula-taller.
  - Docente producción.
  - Auditoría completa.
- Perfil `aula_taller` como salida por defecto.
- Deduplicación de subrecetas por identidad (`source_type:id`) dentro del documento.
- Primera aparición de subreceta: desarrollo según perfil y categoría.
- Apariciones posteriores: referencia breve sin repetir ficha completa.
- Clasificación interna hardcoded de subrecetas:
  - sensibles;
  - bases técnicas;
  - defecto por prudencia.
- Bases técnicas plegadas por defecto en salidas de aula/docente: mirepoix, roux, bouquet garni, sofrito base y equivalentes.
- Subrecetas sensibles desarrolladas en primera aparición: bechamel, crema pastelera, mayonesa, fondos, fumets, veloutés, española, demi-glace y equivalentes.
- APPCC breve en perfil Aula-taller.
- APPCC completo conservado en Docente producción y Auditoría completa.
- Eliminación de bloques B1-B4 repetidos en perfil Aula-taller.
- Encabezado con perfil y fecha de generación.

## Criterio documental

La salida de auditoría completa se mantiene como documento especializado. La salida diaria recomendada pasa a ser `Aula-taller`, para evitar documentos excesivos en prácticas ordinarias.

## Límites conocidos

- La deduplicación no calcula número de página; usa referencia textual.
- La clasificación de subrecetas es estática en esta capa. Una futura 1.1 podrá permitir clasificación editable por el docente.
- No se han validado pesos, mermas, rendimientos ni procesos reales en obrador.
