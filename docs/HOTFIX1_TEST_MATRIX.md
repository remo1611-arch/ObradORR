# HOTFIX1 · Matriz de tests

| Test | Resultado esperado |
|---|---|
| Quiche/preflight | Sin `QUICHE_MASA_DULCE` si no hay masa dulce activa |
| Banoffee | Sin falso crítico si contiene plátano/banana |
| FPB | Sin tabla completa de preflight |
| CM | Sin tabla completa de preflight; detalle de críticos si existen |
| GS | Costes visibles; detalle críticos/altos |
| Auditoría | Preflight completo |
| Pedido | Sin tabla completa de preflight |
| Estados | 0 fichas activas `validada` |
| Bakery | `yield_status=pending` salvo prueba real, no existente |
| SQLite | `integrity_check=ok`, `foreign_key_check=0` |
