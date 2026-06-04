# ObradORR 1.0.0-rc.10

Release candidate de saneamiento documental del Lote 6 · Cocina caliente de producción.

## Cambios principales

- Se pasan a `pendiente` fichas culinarias que estaban como `validada` pero dependen de subrecetas pendientes, emulsiones sensibles, frituras, arroces no validados, conservación no probada o procesos de producción caliente sin prueba real de obrador.
- Se refuerzan avisos de impresión y ficha para:
  - subrecetas recursivas;
  - alérgenos derivados;
  - coste directo ≠ coste recursivo;
  - relación arroz/líquido pendiente;
  - emulsiones técnicas;
  - bechamel y mayonesa sensibles/refrigeradas;
  - aceite como medio de fritura;
  - mantenimiento caliente, enfriado rápido y regeneración pendiente.
- Se corrige el etiquetado técnico del aceite de fritura en Churros y Croquetas de jamón.
- Se mantiene la expansión recursiva de pedido, coste y alérgenos.

## Límites conocidos

- No se reformulan recetas.
- No se inventan rendimientos, gramajes, mermas, absorción de aceite, relación arroz/líquido, puntos de cocción ni vida útil.
- No se declara estable ninguna ficha sin prueba de obrador.
- La validación bibliográfica queda pendiente como fase posterior separada de la validación real de obrador.

## Prueba local

Desde la raíz del proyecto:

```bash
python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc10
```

Reset de datos locales si se ven restos de versión anterior:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc10
```
