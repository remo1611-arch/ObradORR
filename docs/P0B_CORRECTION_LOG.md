# P0-B · Componentes, prefermentos, rendimientos y modelo panadero

Fecha: 2026-06-03 18:25:04 UTC

## Alcance
Corrección quirúrgica sobre el ZIP P0-A. No cambia app_version, release_tag, cache_tag ni VERSION.txt.

## Migraciones mínimas
- `bakery_recipe_components.component_status TEXT NOT NULL DEFAULT 'required'`
- `bakery_preferments.validation_status TEXT NOT NULL DEFAULT 'pending'`
- `bakery_recipes.yield_status TEXT NOT NULL DEFAULT 'pending'`

## Decisiones técnicas
- No se inventan tiempos, temperaturas ni levaduras de prefermento. Los 48 prefermentos técnicos con harina prefermentada incompletos quedan `pending`; los métodos directos/no aplicables quedan `not_applicable`.
- No se inventan pesos cocidos. Los rendimientos genéricos quedan `yield_status='pending'`.
- Los componentes opcionales/variantes no entran en pedido ni coste base.

## Componentes normalizados
- Croissant con poolish / Crema pastelera: optional, sin pedido/coste base.
- Torta de nata / Crema chantilly: optional, sin pedido/coste base.
- Babka chocolate / Ganache negra: required, incluido en pedido/coste base.

## Validación posterior requerida
P0-C deberá imprimir estos estados y alérgenos derivados; P0-E deberá cerrar equivalencia de pedido JS/SQL.
