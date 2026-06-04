# Fuentes y criterios gastronómicos · ObradORR

## Criterio de uso

Las fichas de ObradORR deben entenderse como propuestas técnicas documentales para aula-taller. No son fichas validadas en obrador salvo que el usuario o el centro registren prueba real y resultado.

## Familias de fuentes recomendadas

Para la revisión progresiva de fichas se deben priorizar:

1. Normativa alimentaria vigente aplicable a alérgenos, higiene, restauración y seguridad alimentaria.
2. Manuales profesionales de cocina, pastelería y panadería.
3. Libros de texto de Formación Profesional de Hostelería y Turismo.
4. Fichas técnicas de proveedor para ingredientes compuestos, gelatina, chocolate, cacao, semillas, ovoproductos, salsas comerciales, vinos, vinagres y productos con sulfitos.
5. Prueba real de obrador con registro de rendimiento, merma, proceso, temperatura, conservación y resultado organoléptico.

## Normativa marco a verificar cuando proceda

- Reglamento (UE) 1169/2011, sobre información alimentaria facilitada al consumidor.
- Reglamento (CE) 852/2004, relativo a la higiene de los productos alimenticios.
- Reglamento (CE) 2073/2005, relativo a criterios microbiológicos aplicables a los productos alimenticios.
- Real Decreto 1021/2022, sobre higiene en la producción y comercialización de productos alimenticios en establecimientos de comercio al por menor.
- Real Decreto 126/2015, sobre información alimentaria de alimentos sin envasar.

## Estado documental

El estado `pendiente` no significa que la ficha sea incorrecta. Significa que no debe presentarse como validada hasta que exista contraste suficiente y prueba real.

El estado `validada` debe reservarse para una ficha con evidencia docente/obrador.

El estado `no_apta` debe mantenerse cuando una ficha no sea defendible como ficha final.

## Ampliación RC13 · Vía B

La bibliografía técnica y la normativa se usan para **contrastar** las fichas, no para declararlas validadas. Una ficha puede quedar documentalmente bien fundamentada y seguir en `pendiente` si no se ha probado en aula-taller.

Fuentes marco iniciales incorporadas en SQLite:

- Reglamento (UE) 1169/2011: información alimentaria y declaración de alérgenos.
- Real Decreto 1021/2022: requisitos de higiene en establecimientos de comercio al por menor y restauración.
- AESAN: control de anisakis en productos de la pesca destinados a consumo crudo o insuficientemente cocinado.
- Codex CXC 1-1969: principios generales de higiene y sistema APPCC.
- The Professional Chef, CIA: técnicas culinarias profesionales.
- Professional Baking, Wayne Gisslen: panadería y pastelería profesional.
- On Baking, Labensky, Martel y Van Damme: fundamentos de pastelería y panadería.
- Bread, Jeffrey Hamelman: panificación, masa madre, centenos y prefermentos.
- Manual de restauración moderna, Arranz: referencia docente complementaria.


## Ampliación RC13 · B1

Se registra la primera revisión documental por ficha para salsas recursivas, emulsiones con huevo, crema pastelera y platos dependientes.

La decisión común es mantener las fichas como `pendiente`, aunque la formulación sea documentalmente defendible, porque no hay prueba real de obrador ni rendimientos definitivos.

Criterios reforzados:

- Coste directo ≠ coste recursivo.
- Alérgenos directos ≠ alérgenos derivados.
- Subreceta técnica ≠ producto final validado.
- Revisión bibliográfica ≠ validación de aula-taller.


## Ampliación RC14 · B2

Se registra revisión documental por ficha para cocina caliente de producción.

Criterios reforzados:

- Una receta contrastada bibliográficamente no equivale a receta validada en obrador.
- Los platos con subrecetas deben mostrar alérgenos derivados y coste/pedido recursivo.
- Arroces, risottos y paellas requieren prueba real de relación arroz/líquido y punto.
- Frituras mantienen aceite como medio de cocción, con absorción pendiente.
- Mayonesa, carbonara, pil-pil y holandesa/bearnesa son emulsiones sensibles.
- Lasaña, croquetas, villeroy y piquillos con bechamel son elaboraciones con subreceta sensible.


## Ampliación RC15 · B3

Se registra revisión documental por ficha para pastelería fría, cremas, masas, postres y elaboraciones sensibles.

Criterios reforzados:

- Las cremas con huevo/lácteo son subrecetas sensibles si se usan como relleno.
- Un semifrío o postre frío no se valida por bibliografía: requiere textura, frío, corte/desmolde y vida útil real.
- Gelatina, chocolate, frutos, licores, brillos y decoraciones compuestas mantienen proveedor pendiente si no hay ficha técnica.
- Choux, milhojas, cañas y piezas rellenas deben separar pieza seca de relleno refrigerado.
- Tarta montada con nata/crema/trufa/ganache no equivale a pieza estable a temperatura ambiente.


## Ampliación RC16 · B4

Se registra revisión documental por ficha para panadería, bollería, laminados, masas madre, centenos, sin gluten, fermentaciones no panarias y panes especiales.

Criterios reforzados:

- Fórmula plausible no equivale a ficha validada.
- Peso cocido, merma, fermentación y cocción solo se validan por prueba real de obrador.
- Prefermentos y masas madre mantienen `validation_status = pending` salvo datos reales documentados.
- Laminados requieren pliegues, reposos, grosor, mantequilla de vueltas y fermentación final documentados.
- Panes formulados sin ingredientes con gluten no equivalen a producto certificado sin gluten.
- Dosa, idli e injera se interpretan como fermentaciones no panarias.
