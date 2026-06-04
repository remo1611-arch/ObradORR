# ObradORR 2.0.0 RC3.1 · Hotfix de maquetación

Versión: `2.0.0-rc3.1-hotfix-maquetacion`

## Alcance

Hotfix aplicado sobre RC3 para corregir tres puntos detectados en prueba PDF real:

1. La foto de receta ya no debe quedar apilada bajo el título en impresión: se fuerza cabecera real en dos columnas cuando hay imagen.
2. El APPCC breve de perfiles compactos deja de maquetarse como tabla partida; pasa a tarjeta compacta no divisible.
3. Las subelaboraciones protegen el bloque inicial título + metadatos + estado documental para reducir subtítulos huérfanos.

## Sin cambios

- No se modifican fórmulas.
- No se modifican datos gastronómicos.
- No se modifican estados documentales.
- No se toca backup/import/export.
- No se toca motor recursivo.

## Límite

La validación visual final debe hacerse desde navegador real, porque los saltos de página dependen del motor de impresión del navegador.
