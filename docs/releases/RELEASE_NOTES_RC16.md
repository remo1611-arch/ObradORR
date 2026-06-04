# ObradORR 1.0.0-rc.16

Release candidate documental de **B4 · revisión por fuentes de panadería, pastelería panadera, bollería, laminados, masas madre, centenos, sin gluten y panes especiales**.

## Objetivo

Añadir contraste documental a las fichas activas de `bakery_recipes` sin convertir ninguna en validada. Esta fase consolida el criterio de que una fórmula puede ser bibliográficamente plausible pero sigue pendiente si no hay prueba real de obrador.

## Cambios principales

- Se añaden **97 revisiones documentales B4** en `recipe_documentary_reviews` con `recipe_kind = 'bakery'`.
- Se revisan las **97 fichas activas panaderas/pasteleras**: 96 pendientes y 1 no apta activa.
- Se mantienen todas las fichas en `pendiente` o `no_apta`.
- Se refuerzan avisos sobre:
  - rendimiento y peso cocido pendientes;
  - prefermentos, biga, poolish y masa madre pendientes;
  - laminado, pliegues, reposos, grosor y fermentación final pendientes;
  - centenos, remojos, acidificación y reposo postcocción;
  - panes formulados sin gluten no certificados;
  - fermentaciones no panarias como dosa, idli e injera;
  - panes especiales, pizzas y masas internacionales.

## Fuentes marco añadidas/reforzadas

- Hamelman · *Bread*.
- Calvel · *The Taste of Bread*.
- Gisslen · *Professional Baking*.
- Labensky, Martel y Van Damme · *On Baking*.
- King Arthur Baking como referencia técnica complementaria.
- Reglamento (UE) 1169/2011 y Reglamento de Ejecución (UE) 828/2014 cuando afecta a alérgenos y declaraciones sin gluten.

## Límites

B4 no valida pesos cocidos, mermas, tiempos/temperaturas, madurez de masa madre, acidez, remojos, escaldados, laminado, grosor, fermentación final, textura ni conservación. Todo eso requiere prueba real de obrador y, cuando proceda, ficha técnica de proveedor.
