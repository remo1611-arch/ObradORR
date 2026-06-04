# ObradORR 2.0.0 RC3.1 · Hotfix de maquetación

Versión: `2.0.0-rc3.1-hotfix-maquetacion`

## Alcance

RC3 cierra la salida documental sin tocar fórmulas, datos gastronómicos, estados de validación, backup/import/export ni migración de tablas.

## Cambios

- Nombre sugerido de PDF/documentos mediante `document.title` y utilidad ISO con segundos: `YYYY-MM-DDTHH-MM-SS`.
- Fecha visible en cabecera con formato español largo y coma: `Jueves, 4 de junio de 2026`.
- Imagen principal como cabecera adaptativa, alineada con el nombre, usando `object-fit: contain` para no deformar ni recortar.
- CSS print más compacto: márgenes menores, tablas compactas y repetición de cabeceras de tabla.
- Cortes de página prudentes: títulos con contenido siguiente, filas de tabla indivisibles y subelaboraciones largas partidas de forma controlada.

## Límites

El nombre final del PDF depende del navegador cuando se usa “Guardar como PDF”. ObradORR actualiza `document.title` y los nombres internos/exportados, pero el navegador puede permitir o no respetarlo automáticamente.
