# PRINT_MODEL · ObradORR 1.0.0-rc.2

## Flujo de impresión real

```text
SQLite → funciones de consulta/cálculo → HTML imprimible → iframe → impresión/PDF
```

## Flujo objetivo documentado

```text
SQLite → repositories → domain engines → DocumentContext → print templates → iframe → PDF/impresión
```

La compilación actual conserva el flujo clásico para no romper Android/Termux, pero deja documentada la separación de capas.

## Documentos disponibles

- Fichas técnicas.
- Pedido consolidado.
- Fichas técnicas + pedido.
- Impresión de sesión guardada.

## Condiciones de impresión

- Sin `window.open`.
- Con previsualización interna.
- Con iframe.
- Con subrecetas culinarias según modo seleccionado.
- Con prefermentos y bloques panaderos.
- Con componentes elaborados desarrollados cuando existen.
- Con registro en `print_jobs`.

## Caso bloqueante

Torta de nata nunca debe imprimir nata ni azúcar a 0 g.


## ObradORR 1.0.0-rc.2 · Autoría visible

© 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.

Las fichas impresas incorporan este aviso en el pie documental.
