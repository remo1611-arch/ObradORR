# Copias de seguridad

- **Descargar copia SQLite** genera un archivo portable con fecha ISO hasta segundos.
- **Elegir carpeta de copias** usa File System Access API cuando el navegador lo permite.
- Si el navegador no permite carpeta, ObradORR descarga el archivo normalmente.
- Copias disponibles: SQLite, JSON técnico y ZIP completo.

En Android/Termux algunos navegadores pueden no permitir escribir en carpeta elegida. En ese caso se mantiene el fallback de descarga. Para sesiones importantes en móvil se recomienda descargar copia SQLite al terminar.
