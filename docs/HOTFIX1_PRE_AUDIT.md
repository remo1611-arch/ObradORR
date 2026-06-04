# HOTFIX1 · Pre-auditoría

Base: `ObradORR_1_1_0_EXPERIMENTAL_ALLINONE`.

Hallazgos de entrada:

- La rama experimental arrancaba y generaba documentos.
- RC28 permanece separada y no se modifica.
- El aviso crítico `Quiche con masa dulce` se comprobó como falso positivo: la ficha `REC-QUICHE-LORRAINE` usa `Masa quebrada refrigerada` salada/neutra (`PAS053`) y no tiene subreceta `REC-PAST-QUEBRADA-DULCE` activa.
- El falso positivo procedía de notas históricas que mencionaban la sustitución de la masa quebrada dulce.

Regla de parada aplicada: no se reescribe motor completo; solo se corrige preflight/perfiles y se documentan límites.
