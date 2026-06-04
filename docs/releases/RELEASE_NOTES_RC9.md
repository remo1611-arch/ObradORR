# ObradORR 1.0.0-rc.9

Release candidate documental centrada en el Lote 5: fondos, fumets, salsas, emulsiones, cremas y subrecetas recursivas.

## Estado

Esta versión es **release candidate / pre-release**. No es versión estable final.

## Cambios principales

- Fondos y fumets con aviso de rendimiento, reducción/evaporación, conservación y regeneración pendientes.
- Salsa española, demi-glace, salsa madeira y veloutés marcadas como subrecetas recursivas con coste, pedido y alérgenos derivados.
- Advertencia de coste directo distinto de coste recursivo en fichas complejas.
- Mirepoix y roux documentados como bases técnicas plegables, no productos finales.
- Mayonesa, holandesa y bearnesa con APPCC específico de emulsiones con huevo.
- Crema pastelera como subreceta sensible/refrigerada.
- Bechamel como salsa láctea sensible cuando se enfría o se usa como relleno.
- Salsa de tomate y coulis de fresa con reducción/conservación pendientes.
- Sulfitos y alérgenos de proveedor se mantienen pendientes si no hay ficha técnica.
- Versionado, cache e IndexedDB alineados a `1.0.0-rc.9`.

## Límites

No se han inventado rendimientos, reducciones, evaporaciones, tiempos, temperaturas, vida útil, concentración final, viscosidad ni fichas técnicas de proveedor. El APPCC sigue siendo docente mínimo y no sustituye el manual APPCC del centro.

## Uso recomendado

Abrir desde servidor local o GitHub Pages:

```text
https://remo1611-arch.github.io/ObradORR/
```

En local:

```bash
python -m http.server 8807 --bind 127.0.0.1
```

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc9
```
