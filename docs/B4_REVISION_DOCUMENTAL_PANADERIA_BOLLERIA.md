# B4 · Revisión documental por fuentes · Panadería, bollería, laminados, masas madre, centenos, sin gluten y panes especiales

## Alcance

Aplicado sobre ObradORR 1.0.0-rc.16. Esta fase registra revisiones documentales para las fichas activas de `bakery_recipes`.

No se validan recetas. No se corrigen fórmulas por intuición. No se inventan pesos cocidos, mermas, tiempos, temperaturas, madurez de masa madre, acidez, laminados, reposos ni conservación.

## Resultado cuantitativo

- Revisiones B4 añadidas: **97**.
- Fichas activas revisadas: **97**.
- Pendientes activas: **96**.
- No aptas activas: **1**.

## Familias revisadas

- Panes base y panes con prefermento: baguettes, ciabatta, focaccia, pain de campagne, pan gallego, Vermont, pan de cristal.
- Poolish, biga y masa madre líquida/sólida: solo se documentan como pendientes si no hay prueba de obrador.
- Centenos, integrales, multicereales y panes con semillas/frutos.
- Panes formulados sin gluten y base técnica sin gluten.
- Fermentaciones no panarias: dosa, idli e injera.
- Masas enriquecidas: brioche, bollo suizo, roscón, panettone, larpeira, torta de nata, challah, shokupan.
- Bollería laminada: croissant, pain au chocolat y hojaldre fermentado.
- Panes especiales e internacionales: bagel, pretzel, bao, naan, pita, lavash, kebab, empanada, pizzas, candeal y panes de molde.

## Criterios técnicos

- `yield_status = pending` debe mantenerse si no hay peso cocido real.
- `baked_piece_weight_g = NULL` no debe ocultarse en impresión.
- Merma genérica 12 % no equivale a merma validada.
- Poolish, biga y masa madre requieren tiempo, temperatura, inoculación, madurez y prueba real.
- Laminados requieren mantequilla de vueltas, pliegues, reposos, grosor, fermentación final y cocción real.
- Centenos altos requieren acidificación, remojo/escaldado si procede, reposo postcocción y corte tras maduración.
- Sin gluten formulado no equivale a certificado sin gluten en obrador mixto.
- Dosa, idli e injera no deben leerse como panes clásicos de porcentaje panadero.

## Fuentes marco

- Jeffrey Hamelman · *Bread: A Baker's Book of Techniques and Recipes*.
- Raymond Calvel · *The Taste of Bread*.
- Wayne Gisslen · *Professional Baking*.
- Labensky, Martel y Van Damme · *On Baking*.
- King Arthur Baking · referencias técnicas complementarias.
- Reglamento (UE) 1169/2011.
- Reglamento de Ejecución (UE) 828/2014.

## Decisión documental

Todas las fichas B4 permanecen como `pendiente` o `no_apta`.

Para pasar una ficha a `validada` deberá documentarse, como mínimo: fecha de prueba, responsable, lote de harina/ingredientes críticos, temperatura final de masa, fermentación, cocción, peso cocido, merma real, incidencias, resultado organoléptico y decisión docente.
