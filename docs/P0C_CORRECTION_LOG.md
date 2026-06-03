# P0-C · Alérgenos derivados e impresión documental

Fecha: 2026-06-03T18:36:57Z

## Alcance

Corrección quirúrgica limitada a cálculo y visualización documental de alérgenos derivados. No se modifica APPCC completo, pedido JS/SQL completo ni versionado final.

## Decisiones técnicas

- Se usa `ingredient_allergens.declaration_status` como fuente de estado: `confirmed`, `pending`, `may_contain`.
- El bloque principal filtra exclusivamente alérgenos con `regulation_order` entre 1 y 14.
- Las categorías extra/no estándar permanecen en base pero no se mezclan con la declaración normativa impresa.
- Cocina calcula alérgenos desde `v_culinary_expanded_ingredient_lines`, incluyendo subrecetas recursivas.
- Panadería/pastelería calcula alérgenos desde `bakery_recipe_lines` y componentes `required`.
- Componentes `optional` y `variant` quedan en bloque separado y no contaminan el bloque principal de la ficha base.
- Pedido impreso muestra alérgenos derivados de las líneas que realmente entran en pedido.

## Archivos modificados

- `app/js/obradorr-app-classic.js`
- `app/js/obradorr-app.js`
- `app/css/obradorr.css`
- `db/obradorr.sqlite` solo para metadato `app_meta.p0c_correction` y registro de migración documental si procede.

## Pendiente

- APPCC docente mínimo estructurado: P0-D.
- Pedido JS/SQL equivalente: P0-E.
- Persistencia/reset/importación: P0-F.
- Prueba real Windows/Termux: P0-G.
- Versionado final RC1: P0-H.
