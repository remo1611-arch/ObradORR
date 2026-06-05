# Informe de cierre · ObradORR 2.1.0-RC8 Release Candidate

Fecha de cierre: 2026-06-05 21:19:26 UTC

## Alcance

Cierre técnico controlado. No se modifica `db/obradorr.sqlite` ni `db/obradorr_blank.sqlite`.

## Verificaciones de linaje

- Navegación final presente.
- Guía de uso presente en Inicio.
- Alta cancelable de elaboraciones e ingredientes presente.
- Eliminación segura de elaboraciones e ingredientes presente.
- Importación Excel y plantilla Excel retiradas de la interfaz.
- Exportaciones técnicas conservadas y discretas.
- Corrección de subelaboraciones culinarias conservada.
- Sistema mantiene la corrección conservadora de layout.

## Decisión de código

No se realiza reescritura global. Se corrigen referencias de arranque/caché obsoletas, se consolidan textos de versión y se archiva documentación histórica de hotfixes en `docs/historico_rc/`.

## Política documental

SQLite sigue siendo la fuente de verdad. Excel, CSV y JSON se consideran salidas de consulta/auditoría/respaldo, no vías maestras de edición.

## Estado recomendado

`2.1.0-RC8 Release Candidate`: apta para prueba final en PC y móvil antes de declarar publicación estable.
