# RC9-F · CSS print y maquetación A4

Esta fase separa la hoja de estilos de impresión del JavaScript clásico.

## Cambios

- Nuevo archivo `app/css/print-document.css`.
- `printDocumentShell()` enlaza la hoja CSS externa desde el documento imprimible.
- Se mantiene `print-view.html` como vista principal y el visor integrado como respaldo.
- Se conservan las clases y la estructura HTML existentes para no cambiar la lógica documental.

## Alcance

RC9-F no modifica SQLite, recetas, ingredientes, APPCC, alérgenos, costes ni pedido de producción. La mejora se limita a la capa de presentación impresa.

## Criterios de maquetación

- A4 con margen controlado.
- Encabezados y bloques introductorios protegidos frente a cortes de página.
- Fotos contenidas para no desplazar el proceso ni las tablas.
- Tablas con cabecera repetible y anchos estables.
- Subelaboraciones, APPCC y bloques largos pueden partirse de forma controlada cuando sea necesario.
