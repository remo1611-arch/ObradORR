# RC9 · Saneamiento documental del Lote 5

## Alcance

Aplicado sobre ObradORR 1.0.0-rc.8 para generar ObradORR 1.0.0-rc.9.

Lote afectado: fondos, fumets, salsas madre, salsas derivadas, roux, mirepoix, emulsiones, bechamel, crema pastelera, salsa de tomate y coulis.

## Cambios aplicados

- Fondos y fumets: aviso de rendimiento, reducción/evaporación, cocción, enfriado, conservación y regeneración pendientes.
- Fumet: aviso específico de cocción corta, colado fino, enfriado rápido y alérgeno pescado visible.
- Salsas recursivas: aviso de subreceta recursiva, alérgenos derivados, pedido consolidado y coste recursivo.
- Salsa española, demi-glace, salsa madeira y veloutés: subfichas relevantes desplegadas por defecto, salvo bases técnicas simples.
- Mirepoix y roux: base técnica, no producto final; plegadas por defecto en impresión.
- Mayonesa: aviso de emulsión fría con huevo y uso preferente de ovoproducto pasteurizado en contexto docente.
- Holandesa y bearnesa: aviso de emulsión caliente/tibia con yema y uso inmediato.
- Crema pastelera: subreceta sensible/refrigerada.
- Bechamel: salsa láctea sensible si se enfría o se usa como relleno.
- Salsa de tomate: reducción, rendimiento, conservación y regeneración pendientes.
- Coulis de fresa: pendiente de definir como crudo, cocido o pasteurizado en proceso docente.
- Sulfitos/alérgenos de proveedor: se mantienen como pendientes de ficha técnica cuando proceda.

## No aplicado

No se han cerrado rendimientos, reducciones, evaporaciones, tiempos, temperaturas, vida útil, concentración final, punto napante ni datos de proveedor.

## Validaciones

- `python tools/validate_release.py .` → VALIDACIÓN OK.
- `node --check app/js/obradorr-app-classic.js` → OK.
- `node --check app/js/obradorr-app.js` → OK.
- `PRAGMA integrity_check` → ok.
- `PRAGMA foreign_key_check` → 0 errores.

## Estado

RC9 es release candidate. No es versión estable.
