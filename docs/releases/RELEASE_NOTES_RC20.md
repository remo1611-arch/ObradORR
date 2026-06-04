# ObradORR 1.0.0-RC20

RC20 es una corrección menor de cierre visual y semántico de impresión sobre RC19. No valida recetas, no corrige fórmulas y no modifica SQLite gastronómica: todas las fichas siguen siendo propuestas docentes pendientes de prueba real de obrador, salvo las marcadas como no aptas.

## Cambios principales

- El encabezado del **Pedido consolidado** queda identificado como perfil `Pedido consolidado`, no como auditoría documental.
- Los bloques de alérgenos principales pasan a rotularse como **Alérgenos directos y derivados consolidados**, evitando la lectura contradictoria entre alérgenos del componente y alérgenos derivados.
- El pedido usa el rótulo **Alérgenos globales del pedido**.
- Se ajusta la paginación de tablas APPCC para reducir saltos con cabeceras aisladas y páginas parcialmente vacías.
- Se mantiene el comportamiento confirmado de RC19: los checks **Mostrar costes** y **Mostrar APPCC docente** afectan realmente a la salida impresa.

## Lo que no cambia

- No se marcan fichas como `validada`.
- No se inventan pesos cocidos, mermas, reducciones, absorción de aceite, tiempos, temperaturas ni datos de proveedor.
- No se modifica la política documental de propuesta contrastable pendiente de prueba real de obrador.
- No se reestructura el motor de perfiles; solo se afinan rótulos y paginación.

## Prueba recomendada

Generar y revisar visualmente cinco salidas:

1. Aula-taller sin costes y sin APPCC detallado.
2. Aula-taller con costes.
3. Docente producción con APPCC.
4. Auditoría documental completa.
5. Pedido consolidado.
