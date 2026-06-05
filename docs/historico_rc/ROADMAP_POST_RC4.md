# Hoja de ruta posterior a RC5

## Estado actual

`ObradORR 2.1.0-RC7 · Hardening de bases + validación preparada`

RC5 no añade nuevas funciones de catálogo ni Excel. Su objetivo es dejar segura la base para las siguientes mejoras.

## Siguiente fase recomendada

### RC7 · Release candidate integral

Objetivo: exportar datos a Excel sin importar todavía.

- Exportar catálogo completo `.xlsx`.
- Exportar plantilla vacía `.xlsx`.
- Hojas propuestas:
  - `00_LEEME`
  - `01_LISTAS_VALIDAS`
  - `02_ELABORACIONES`
  - `03_INGREDIENTES`
  - `04_LINEAS_RECETA`
  - `05_PROCESOS`
  - `06_FORMULACION_PANADERA`
  - `07_COMPONENTES_SUBRECETAS`
  - `08_ALERGENOS`
  - `09_VALIDACION_OBRADOR`
  - `10_AVISOS`
  - `99_AUX_VALIDACION`
- Sin macros.
- Con fórmulas de aviso en hoja auxiliar identificada.
- SQLite sigue siendo fuente de verdad.

### RC7 · Release candidate integral

Objetivo: importar plantilla Excel cubierta solo como altas nuevas.

- Staging previo.
- Informe de errores/avisos.
- Backup obligatorio.
- Transacción SQLite.
- Fichas importadas como `pendiente`.
- Nunca validar por Excel.
- No sobrescribir fichas existentes.

### RC7 · Release candidate integral

Objetivo: probar todo junto.

- Gestión de bases.
- Importación combinada.
- Exportación Excel.
- Importación de altas Excel.
- Impresión/PDF.
- Pedido consolidado.
- Backup/import/export.
- Validación preparada sin considerar fichas validadas hasta prueba real.

## Para fase posterior

### 2.2 · Excel avanzado / validación de obrador real

- Importar Excel completo editado.
- Actualizar fichas existentes con staging estricto.
- Importar evidencias de obrador desde Excel.
- Actas y rendimientos reales tras pruebas docentes.
