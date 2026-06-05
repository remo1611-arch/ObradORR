# ObradORR 2.1.0 · Validación de obrador

Versión evolutiva sobre ObradORR 2.0.0. Añade un flujo específico para registrar pruebas reales de obrador sin validar automáticamente ninguna ficha.

## Cambios principales
- Nueva pestaña **Validación de obrador**.
- Registro de prueba por elaboración con fecha, responsable, grupo/módulo, práctica, resultado, cantidades reales, incidencias y ajustes.
- Campos específicos para panadería/formulación: harina, masa cruda, piezas, pesos, merma, TFM, fermentación y notas de cocción.
- Histórico en `workshop_validation_log`.
- Estados: `no_validada`, `probada_con_ajustes`, `requiere_revision`, `validada`.
- Regla de invalidación: si una ficha validada se modifica en datos sustanciales pasa a `requiere_revision`.
- Preflight reforzado para detectar fichas validadas sin registro real.

## Lo que no cambia
No se modifican fórmulas, ingredientes, costes, APPCC/alérgenos ni el motor de pedido. Ninguna ficha queda validada por defecto.
