# RC9 · Unificación del resolvedor de alérgenos

## Objetivo

Corregir de raíz la divergencia detectada entre los alérgenos consolidados por ficha y los alérgenos del pedido de producción.

## Problema detectado

En fichas panaderas/pasteleras con líneas directas de harina, huevo, leche, mantequilla o nata, el bloque de alérgenos podía aparecer vacío si el conjunto de visitados recursivos ya contenía la propia ficha.

## Solución aplicada

Se añaden funciones comunes:

- `visitedWithoutCurrent(sourceType, recipeId, visited)`
- `resolveRecipeAllergenBundle(sourceType, recipeId, visited)`
- `resolveRecipeAllergens(sourceType, recipeId, visited)`

La ruta panadera elimina la ficha actual del conjunto de visitados antes de resolver sus ingredientes directos, manteniendo la protección frente a ciclos en componentes y subelaboraciones.

## Criterio de cierre

Casos mínimos de regresión:

- Ajoblanco: Gluten y Frutos de cáscara.
- Tortilla estilo Betanzos: Huevos.
- Torta de nata: Gluten, Huevos y Leche.
- Crema chantilly: Leche.

La corrección no modifica SQLite ni datos gastronómicos.
