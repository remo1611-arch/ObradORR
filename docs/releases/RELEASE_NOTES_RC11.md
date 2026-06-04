# ObradORR 1.0.0-rc.11

Release candidate documental.

## Objetivo

RC11 aplica una política conservadora de validación: ninguna ficha queda como `validada` si no consta prueba real de obrador/aula-taller. Las fichas pasan a considerarse propuestas técnicas documentales pendientes de contraste final, fuente y prueba.

## Cambios aplicados

- `culinary_recipes.release_status`: todas las fichas no `no_apta` pasan a `pendiente`.
- `bakery_recipes.release_status`: todas las fichas no `no_apta` permanecen o pasan a `pendiente`.
- Campo legacy `status`: las fichas activas dejan de figurar como `validated` para evitar ambigüedad en editores y vistas.
- Se preservan fichas `no_apta`.
- Se actualizan `app_meta`, `VERSION.txt`, cache tag y documentación a `1.0.0-rc.11`.
- Se añade aviso documental: propuesta técnica contrastable, no validada en obrador.

## Qué no se ha hecho

- No se reformulan recetas.
- No se inventan rendimientos, mermas, tiempos, temperaturas, absorciones, vida útil ni datos de proveedor.
- No se declara ninguna ficha estable desde el punto de vista gastronómico.

## Uso recomendado

Usar las fichas como base docente revisable. Cuando una ficha se pruebe en obrador, se pese, se documente y se contraste, podrá pasar a `validada` en una fase posterior.
