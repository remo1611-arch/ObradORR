# Matriz de regresión documental · RC9-K

| Caso | Tipo de documento | Modelo | Comprobación esperada |
|---|---|---|---|
| C1 | Fichas | Ficha de trabajo | Ingredientes, cantidades, foto si existe y proceso sin escandallo |
| C2 | Fichas | Ficha técnica | Bloques técnicos moderados y APPCC breve si procede |
| C3 | Fichas | Ficha técnica ampliada | APPCC completo y subelaboraciones desarrolladas según ajuste |
| C4 | Fichas | Dossier completo de producción | Costes, escandallo, validación documental y trazabilidad |
| C5 | Pedido de producción | No aplica | Ingredientes consolidados sin fichas |
| C6 | Fichas + pedido de producción | Ficha técnica | Fichas primero y pedido consolidado al final |
| C7 | Fichas | Panadería | Bloques diferenciados: prefermento, masa final, acabados y proceso |
| C8 | Fichas | Subelaboraciones | `No desarrollar`, `Desglosar ingredientes` e `Incluir subfichas` sin duplicados evidentes |
| C9 | Dossier | Escandallo | Coste técnico docente con aviso de límites económicos |
| C10 | Todos | Vista independiente | `print-view.html` abre y conserva fallback a visor integrado |

## Resultado automático

La validación incluida en `tools/validate_release.py` comprueba estructura, tokens, presencia de módulos, CSS externo, retirada de etiquetas antiguas y coherencia SQLite.
