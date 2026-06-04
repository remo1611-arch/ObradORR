# Importación combinada segura

La acción **Importar y combinar SQLite** no sustituye la base actual.

Flujo:

1. Selección de SQLite externa.
2. Apertura en staging.
3. Validación de esquema ObradORR.
4. Informe previo de nuevos, duplicados y conflictos.
5. Copia SQLite previa de la base actual.
6. Fusión sin sobreescritura.
7. Conflictos como variantes con sufijo `IMPORT-YYYY-MM-DDTHH-MM-SS`.
8. Validación posterior.

Política:

- Duplicado idéntico: se omite.
- Registro nuevo: se importa.
- Conflicto: se crea variante.
- Reemplazo directo: no permitido por defecto.
