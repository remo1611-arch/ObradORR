# RC3 · Cierre de maquetación PDF

## Nombre de documentos

La app genera nombres seguros con ISO hasta segundos:

```text
ObradORR_AulaTaller_Practica_2026-06-04T22-09-37
```

En impresión por navegador, se actualiza `document.title` antes de imprimir para sugerir ese nombre al guardar como PDF. El comportamiento final depende del navegador.

## Fecha visible

Se mantiene el formato español largo con coma:

```text
Jueves, 4 de junio de 2026
```

## Imagen de cabecera

La foto deja de tratarse como banner. En el documento imprimible queda como imagen de cabecera alineada a la derecha del nombre de la receta. Se usa `object-fit: contain` para conservar el formato original.

## Cortes de página

RC3 añade reglas prudentes para:

- evitar títulos huérfanos;
- evitar cortar filas de tabla;
- conservar cabeceras de receta;
- permitir partir subelaboraciones largas para evitar páginas casi vacías;
- repetir `thead` en tablas largas.
