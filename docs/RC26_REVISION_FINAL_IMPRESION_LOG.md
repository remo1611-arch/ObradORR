# ObradORR 1.0.0-rc.26 · Revisión final de impresión/PDF y coherencia documental

## Alcance

RC26 parte de RC25-DATA4 y realiza revisión final de impresión/PDF y coherencia documental.

No se ha reescrito el motor de impresión. No se han validado fórmulas en obrador. Todas las fichas activas continúan sin `release_status='validada'`.

## Corrección funcional aplicada

Durante la revisión se detectó un bug real en el pedido consolidado recursivo:

- Las subrecetas sin `yield_quantity` se imprimían como advertencia en ficha, lo cual era aceptable documentalmente.
- Pero en el pedido consolidado sus ingredientes podían entrar como lote completo, sin escalar por la cantidad solicitada de la ficha padre.
- Caso representativo: `REC-PAST-ALMIBAR-30` usado en tartas con cantidades parciales de calado.

Cambio aplicado en la vista SQLite `v_culinary_expanded_ingredient_lines`:

```sql
-- antes
ELSE 1.0

-- ahora
ELSE e.quantity
```

Interpretación: si una subreceta no tiene rendimiento validado, el pedido consolidado escala de forma operativa por la cantidad solicitada de la línea padre. Esto no valida el rendimiento real, pero evita que el pedido imprima el lote completo de la subreceta.

## Ejemplo de prueba

`REC-PAST-TARTA-SAN-MARCOS` usa `0,35 l` de `REC-PAST-ALMIBAR-30`.

La expansión del pedido para el calado queda:

```text
Azúcar blanco: 0,105 kg
Agua potable: 0,245 l
```

Frente al comportamiento previo:

```text
Azúcar blanco: 0,300 kg
Agua potable: 0,700 l
```

## Estado documental

- `release_status='validada'`: 0 fichas activas.
- `release_status='pendiente'`: política general.
- `no_apta`: se conserva solo donde procede.
- `recipe_documentary_reviews`: rastro de cobertura, no verdad de calidad.

## Límite

No he realizado prueba visual interactiva real con Chromium en este contenedor: la navegación local queda bloqueada por política del navegador (`ERR_BLOCKED_BY_ADMINISTRATOR`). La validación RC26 es por integridad SQLite, comprobación estática de motor de impresión y pruebas SQL de expansión recursiva.
