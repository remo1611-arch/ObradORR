# Arquitectura experimental final all-in-one

Flujo aplicado:

```text
SQLite bruto
↓
Modelo documental normalizado (`document-model.js`)
↓
Motor recursivo 2.0 (`recursive-engine.js`)
↓
Perfiles declarativos (`document-profiles.js`)
↓
Preflight documental (`preflight-engine.js`)
↓
Renderizado HTML/PDF del navegador
```

El pedido impreso usa el motor recursivo 2.0 como fuente principal. El motor clásico queda como fallback si el motor 2.0 lanza error o no devuelve líneas.

RC28 no se modifica y sigue siendo candidata estable.
