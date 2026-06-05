# ObradORR 2.1.0-RC8 · Print UX Hotfix

Parche limitado de interfaz para la pestaña **Sesión actual**.

## Alcance

- Reorganiza la pestaña Sesión actual como flujo guiado de trabajo docente.
- Mantiene el motor de impresión, el modelo documental y las exportaciones existentes.
- No modifica la base SQLite ni los datos gastronómicos.

## Cambios funcionales de interfaz

1. Bloque superior de práctica actual con resumen de elaboraciones seleccionadas.
2. Selección de documento como primer paso visible:
   - Fichas + pedido.
   - Fichas.
   - Pedido.
3. Selección de nivel documental como segundo paso visible.
4. Selección de elaboraciones y cantidades dentro del flujo principal.
5. Datos docentes como bloque claro y no mezclado con opciones técnicas.
6. Opciones avanzadas plegadas por defecto.
7. Búsqueda de elaboraciones desplazada a panel lateral/segundo bloque.
8. Acción principal renombrada como vista previa / impresión PDF.

## Exclusiones

No se ha tocado:

- `db/obradorr.sqlite`.
- `db/obradorr_blank.sqlite`.
- Recetas, ingredientes, alérgenos, APPCC, costes o fórmulas.
- Motor recursivo.
- Generación PDF/HTML de impresión.
- Exportaciones técnicas.
- Validación de obrador.
