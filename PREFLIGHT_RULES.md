# PREFLIGHT_RULES · Motor de validación documental

El preflight no valida en obrador. Detecta contradicciones antes de imprimir o editar.

Severidades:
- CRÍTICO: contradicción grave o uso estable no recomendable.
- ALTO: seguridad alimentaria, alérgenos, pedido o identidad técnica.
- MEDIO: mejora documental.
- BAJO: aviso informativo/estado pendiente.

Reglas implementadas:
- ficha `validada` sin obrador;
- ficha pendiente sin aviso documental;
- banoffee sin plátano;
- quiche con masa dulce;
- sin gluten con cereal con gluten;
- pescado crudo/marinado sin anisakis/congelación;
- salsa fría con huevo sin APPCC específico;
- emulsión templada sin servicio inmediato;
- subreceta sin rendimiento base;
- alérgenos pendientes de proveedor;
- `bakery_recipes` con yield_status no pending.

Fuentes marco: Reglamento (CE) 852/2004, Reglamento (CE) 2073/2005, Reglamento (UE) 1169/2011, Real Decreto 1021/2022 y criterios AESAN usados como marco documental, no como validación de obrador.
