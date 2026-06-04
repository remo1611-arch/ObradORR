# ObradORR 2.0.0-rc2-backup-import-export

## Alcance

RC2 aplica mejoras de seguridad de datos y salida documental sobre RC1:

- Imagen principal como cabecera adaptativa alineada con el nombre de la receta.
- Nombres de exportación/backup con sello ISO seguro hasta segundos (`YYYY-MM-DDTHH-MM-SS`).
- Fecha visible en documentos imprimibles en español largo: `Jueves 4 de junio de 2026`.
- Carpeta de copias si el navegador soporta File System Access API, con fallback por descarga.
- Importación combinada segura de SQLite externa sin sobreescritura: staging, informe previo, copia previa y conflictos como variantes.

## Sin cambios gastronómicos

No se modifican fórmulas, estados de validación ni estructura culinary/bakery.
