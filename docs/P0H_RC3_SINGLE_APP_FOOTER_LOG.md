# ObradORR 1.0.0-rc.5 · Corrección de pie duplicado

## Corrección

Se elimina el pie estático duplicado de `app/obradorr.html` porque la aplicación ya renderiza el pie visible mediante JavaScript dentro de `#app`.

## Resultado esperado

- En la app se muestra una sola vez: © 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.
- En las impresiones se mantiene el pie legal documental.
- `index.html`, `Abrir_ObradORR.html` y `reset_local_data.html` conservan su pie cuando se abren de forma independiente.

## Alcance

No se modifican recetas, ingredientes, alérgenos, APPCC, pedido, persistencia ni formulaciones.

## Versión

`1.0.0-rc.5` · release candidate.
