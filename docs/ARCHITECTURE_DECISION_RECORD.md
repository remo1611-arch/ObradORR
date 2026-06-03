# ARCHITECTURE_DECISION_RECORD · ObradORR 1.0.0-rc.4

## Decisión

Se adopta una estrategia híbrida por sustitución controlada.

## Motivo

La base actual es funcional y compatible con Android/Termux. Una reescritura completa en módulos ES en un único salto aumentaría el riesgo de regresión de arranque, impresión y SQLite WASM.

## Consecuencia

La versión pública mantiene `obradorr-app-classic.js` como runtime principal, pero incorpora carpetas objetivo para extraer progresivamente:

- `db/`
- `repositories/`
- `domain/`
- `documents/`
- `print/`
- `ui/`
- `storage/`
- `qa/`

## Regla futura

Ninguna nueva función crítica debe calcular directamente desde UI si puede vivir en repositorio, motor de dominio o contexto documental.
