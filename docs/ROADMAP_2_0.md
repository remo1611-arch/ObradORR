# ROADMAP_2_0 · ObradORR 1.0.0-rc.5

Leyenda: [ ] Pendiente · [~] En curso · [x] Realizado · [✓] Validado · [!] Bloqueado

## Fase 0 · Contrato funcional
[x] Mantener núcleo docente: elaboración, selección, cálculo, impresión, sesión.
[x] No convertir en ERP/TPV/stock/nube/login.
[✓] Entrada pública `app/obradorr.html`.

## Fase 1 · Base técnica limpia
[x] Cache tag 2.0.
[x] Loader clásico conservado por compatibilidad.
[x] Carpetas objetivo creadas: db, repositories, domain, documents, print, ui, storage, qa.
[~] Extracción real a módulos queda como trabajo de endurecimiento posterior.

## Fase 2 · SQLite y migraciones
[x] Metadatos `1.0.0-rc.5`.
[x] Tabla `schema_migrations`.
[x] `PRAGMA integrity_check` validado.
[x] `PRAGMA foreign_key_check` validado.
[✓] Componentes semilla incorporados.

## Fase 3 · Motores de dominio
[x] Cálculo culinario y panadero heredado conservado.
[x] Validación de ciclos añadida para subrecetas culinarias y componentes panaderos.
[~] Extracción a `domain/` pendiente para una 2.0 endurecida modular.

## Fase 4 · Modelo documental e impresión
[x] Impresión por iframe.
[x] Fichas, pedido y fichas + pedido conservados.
[x] `print_jobs` registra documentos generados.
[~] `DocumentContext` formal está documentado, pero el runtime conserva funciones clásicas.

## Fase 5 · Edición guiada
[x] Ficha culinaria/panadera.
[x] Líneas culinarias/panaderas.
[x] Prefermento.
[x] Pasos técnicos.
[x] Componentes elaborados añadir/editar/eliminar.
[x] Ingredientes y alérgenos heredados.

## Fase 6 · QA y publicación
[x] Script `tools/validate_release.py`.
[x] Matriz de pruebas documentada.
[ ] Validación manual en navegador real por el usuario antes de considerar release cerrada.
