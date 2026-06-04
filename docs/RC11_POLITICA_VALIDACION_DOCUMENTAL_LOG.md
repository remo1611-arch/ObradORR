# RC11 · Política de validación documental

Aplicado sobre ObradORR 1.0.0-rc.10 para generar ObradORR 1.0.0-rc.11.

## Decisión técnica

A partir de RC11, ObradORR diferencia claramente entre:

- `pendiente`: ficha técnica documental, útil como propuesta de aula, no probada todavía en obrador.
- `validada`: estado reservado a una ficha probada realmente en obrador/aula-taller, con rendimiento, proceso, APPCC y resultado documentados.
- `no_apta`: ficha que no debe usarse como ficha final por error técnico, documental o de planteamiento.

## Corrección ejecutada

- Todas las recetas culinarias no `no_apta` pasan a `pendiente`.
- Todas las recetas panaderas/pasteleras no `no_apta` pasan a `pendiente`.
- Se retira el estado legacy `validated` en fichas activas para evitar contradicción entre editor, catálogo e impresión.
- Se conserva `no_apta` en las fichas que ya estaban bloqueadas.

## Criterio gastronómico

La auditoría documental y el contraste bibliográfico pueden hacer que una ficha sea razonable o defendible, pero no equivalen a validación de obrador. La validación de obrador requiere, como mínimo:

- prueba real;
- rendimiento real;
- corrección de proceso;
- control de conservación/servicio si procede;
- revisión de alérgenos y proveedor;
- registro de observaciones docentes.

## Límite

No se han corregido formulaciones completas ni se han cerrado datos no probados.
