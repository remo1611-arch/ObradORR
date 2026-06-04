# Importación segura

La opción recomendada es `Importar y combinar SQLite`.

Flujo:

1. Carga la base externa en staging.
2. Valida estructura básica.
3. Crea una copia previa.
4. Omite duplicados idénticos.
5. Convierte conflictos en variantes.
6. No reemplaza la base activa por defecto.
7. Registra la operación en `import_log`.

La restauración/sustitución completa existe, pero debe usarse solo cuando se quiera reemplazar la base activa.
