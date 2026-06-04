# RC3.1 · Corrección fina de maquetación PDF

## Cambios aplicados

### Cabecera de receta con foto

Se refuerza la cabecera real:

- texto a la izquierda;
- foto a la derecha;
- `object-fit: contain` para conservar el formato original;
- sin foto, el texto ocupa todo el ancho;
- en móvil, la foto puede bajar debajo del título.

### APPCC breve compacto

En perfiles compactos, el APPCC breve deja de salir como tabla de dos filas que podía partirse dejando `MEDIDA CLAVE` sola en una página. Ahora se genera como tarjeta `appcc-brief-card` con rejilla interna compacta.

### Subelaboraciones

Se añade `sub-sheet-intro` para proteger el conjunto inicial de subelaboración: título, cantidad/rendimiento/factor y estado documental. El objetivo es evitar subtítulos huérfanos al final de página.

## Fecha visible

Se mantiene el formato con coma:

`Jueves, 4 de junio de 2026`

## Nombre de PDF/documento

Se conserva el patrón ISO con segundos heredado de RC3:

`YYYY-MM-DDTHH-MM-SS`
