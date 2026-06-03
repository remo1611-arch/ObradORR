# P0-E · Pedido JS/SQL equivalente

Corrección quirúrgica aplicada sobre P0-D.

## Decisión de diseño

SQL queda como fuente canónica contrastable de pedido consolidado para sesiones guardadas mediante `v_class_order_lines`. El motor JS de impresión mantiene la misma política de inclusión:

- cocina: ingredientes directos y subrecetas recursivas;
- panadería: líneas directas de fórmula;
- componentes panaderos/pasteleros: solo `component_status='required'` e `include_in_order=1`;
- componentes `optional` y `variant`: excluidos del pedido base.

## Vistas creadas/recreadas

- `v_bakery_order_lines`
- `v_class_bakery_item_lines`
- `v_class_culinary_item_lines`
- `v_class_order_lines`

Las vistas incluyen metadatos: `source_type`, `component_status`, `included_in_base_order`, `order_group_id`, `storage_zone_id`, `used_in`.

## Casos validados

- Babka chocolate incluye Ganache negra required en pedido.
- Croissant con poolish no incluye Crema pastelera optional en pedido base.
- Torta de nata no incluye Chantilly optional en pedido base.
- Larpeira queda sin doble fuente culinaria/panadera activa.

No se modificó APPCC, persistencia, reset, importación ni versionado final.
