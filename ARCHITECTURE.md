# ObradORR 1.1.0 EXPERIMENTAL ALL-IN-ONE · Arquitectura

Rama experimental derivada de RC28-STABLE-CANDIDATE. RC28 queda como candidata estable docente y no se sustituye conceptualmente hasta prueba real.

## Regla aplicada
Si una fase obligaba a reescribir más del 30-40 % del motor actual, se detuvo y se documentó. En esta entrega no se ha sustituido el núcleo de impresión ni el motor SQLite; se añadieron capas funcionales conectadas por adaptadores.

## Flujo objetivo implantado parcialmente

SQLite bruto → modelo documental normalizado → motor recursivo verificable → perfiles declarativos → preflight → renderizado HTML/PDF.

## Capas nuevas
- `app/js/domain/document-profiles.js`: perfiles declarativos.
- `app/js/domain/recursive-engine.js`: fuente experimental verificable para pedido/alérgenos.
- `app/js/domain/document-model.js`: normalización documental.
- `app/js/qa/preflight-engine.js`: validación gastronómica/documental preventiva.
- `app/js/ui/safe-editor.js`: vista de impacto para edición.
- `app/js/storage/migrations.js`: infraestructura no destructiva de migraciones.

## Bloques no reescritos
- Motor principal de impresión: conservado, con integración de preflight.
- SQLite: conservado.
- UI principal: conservada.
- Editor: conservado, con vista de impacto.

## Límite
No es versión estable. Es rama experimental para probar arquitectura antes de decidir v1.1/v2.0.
