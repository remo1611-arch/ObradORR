## 1.0.0-rc.22-data1 · Corrección conceptual P0

- Corrige las 10 fichas P0 del Lote 7.
- Mantiene todas las fichas como propuestas documentales pendientes de prueba de obrador.
- No modifica motor ni impresión.

## 1.0.0-rc.22-0 · Preflight documental

- Cambia el `DEFAULT` de `release_status` en `culinary_recipes` y `bakery_recipes` a `pendiente`.
- Añade restricción de valores para `release_status` y `yield_status`.
- Fuerza la creación de fichas nuevas desde JavaScript como `release_status='pendiente'`.
- Retira la opción ordinaria `Validada` del editor de fichas; la validación queda reservada a prueba real de obrador.
- Actualiza metadatos residuales RC20/RC21 a RC22-0.
- No modifica fórmulas, rendimientos, procesos gastronómicos ni motor de impresión.

# CHANGELOG · ObradORR

## 1.0.0-rc.21

- Refactorización conservadora del motor de impresión.
- Separación explícita entre modelo de documento, render HTML y presentación/registro.
- Eliminación de funciones internas no utilizadas.
- Limpieza de clases CSS versionadas en avisos documentales.
- Documentación nueva de perfiles de salida en `docs/PRINT_PROFILES.md`.
- Limpieza documental: release notes históricas en `docs/releases/` y validaciones históricas en `docs/validation/`.
- Sin cambios de fórmula, rendimiento, alérgenos ni APPCC de base.

## 1.0.0-rc.20

- Cierre menor de impresión sobre RC19.
- Pedido consolidado identificado como pedido, no como auditoría.
- Rótulos de alérgenos aclarados: directos/derivados en ficha y globales en pedido.
- Ajuste de paginación APPCC.

## 1.0.0-rc.19

- Corrección de perfiles documentales y opciones manuales de impresión.
- `Mostrar costes` y `Mostrar APPCC docente` funcionan como checks efectivos.
- Mejora de salida aula-taller, docente producción, auditoría y pedido consolidado.

## 1.0.0-rc.18

- Corrección del problema de override de opciones por perfil.
- Primera consolidación funcional del modelo de impresión por perfiles.

## 1.0.0-rc.17

- Modelo de salida documental por perfiles: aula-taller, docente producción, auditoría y pedido.
- Deduplicación de subrecetas y plegado de bases técnicas.

## 1.0.0-rc.16

- B4: revisión documental de panadería, bollería, laminados, masas madre, centenos, sin gluten y panes especiales.
- Todas las fichas activas de panadería/pastelería quedan como `pendiente` o `no_apta`.

## 1.0.0-rc.15

- B3: revisión documental de pastelería sensible, cremas, semifríos, masas, postres y rellenos.

## 1.0.0-rc.14

- B2: revisión documental de cocina caliente de producción.

## 1.0.0-rc.13

- Inicio de Vía B: fuentes documentales y revisiones por ficha/familia.

## 1.0.0-rc.11

- Normalización global de estados: `validada` se reserva a prueba real de obrador.

## 1.0.0-rc.6

- Saneamiento gastronómico-documental de lotes críticos iniciales.
- Aceite de fritura documentado como medio/pedido con absorción pendiente.
- Fichas no aptas y pendientes muestran advertencia documental.


## 1.0.0-rc.28-stable-candidate · RC28-STABLE-CANDIDATE / RC1 docente

- Cierre documental de primera versión sobre RC27-DATA5-7.
- Actualización coherente de versión, `release_tag`, `cache_tag`, SQLite `app_meta` y documentación.
- Añadidas guías RC28 para Termux/Windows, matriz de validación, límites y hoja DATA8.
- No se modifican fórmulas, rendimientos, motor de impresión ni migración de tablas.
- Se mantiene política: fichas pendientes salvo `no_apta`; validación reservada a prueba real de obrador.
