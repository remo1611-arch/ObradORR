# RC28 · Cierre de primera versión docente

## Decisión de cierre

RC28 se declara **stable-candidate / RC1 docente** porque la aplicación ha alcanzado un punto suficiente para prueba real de uso docente:

- motor local/offline funcional;
- SQLite íntegra;
- pedido consolidado recursivo corregido;
- fichas activas sin `release_status='validada'`;
- creación de fichas nuevas como `pendiente`;
- catálogo cubierto y refinado documentalmente hasta DATA7;
- documentación técnica y gastronómica trazada;
- límites de validación explícitos.

## Criterio de no avance

A partir de RC28 no deben introducirse nuevas correcciones de contenido salvo que se documente un bug real o una incoherencia bloqueante. Las mejoras gastronómicas no urgentes pasan a DATA8 o a versiones posteriores.

## Estados

- `pendiente`: propuesta documental contrastada, pendiente de prueba de obrador.
- `no_apta`: ficha bloqueada o no apta como producto final.
- `validada`: reservado para prueba real por profesorado.

## Uso previsto

ObradORR RC28 se orienta a aula-taller de FP de Cocina, Panadería y Pastelería, como herramienta local/offline para generar fichas, prácticas, pedidos, APPCC docente, alérgenos y documentación de apoyo.
