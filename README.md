# ObradORR 2.1.0-RC8 · Release Candidate

Aplicación web offline para aula-taller de cocina, pastelería y panadería.

Esta release candidate consolida la línea 2.1.0-RC8 tras los refinamientos de interfaz, edición segura, eliminación controlada y guía de uso. El objetivo es cerrar una versión de prueba docente coherente antes de una posible publicación estable.

## Navegación final

`Inicio · Sesión actual · Sesiones guardadas · Elaboraciones · Ingredientes · Validación de obrador · Sistema`

## Incluye

- Sesión actual como flujo guiado para preparar fichas, pedido o ficha + pedido.
- Sesiones guardadas en la copia SQLite activa.
- Edición cómoda de elaboraciones e ingredientes.
- Alta cancelable: no se crea una elaboración o ingrediente hasta confirmar `Crear y editar`.
- Eliminación segura de elaboraciones e ingredientes, bloqueada si el registro está en uso.
- Guía de uso plegada en Inicio.
- Validación de obrador preparada sin validar automáticamente fichas.
- Exportaciones técnicas discretas y plegadas.
- Importación Excel retirada; Excel/CSV/JSON quedan como salidas de consulta, auditoría o respaldo.
- Copias SQLite, restauración y combinación segura.

## Metadatos técnicos

- Versión visual: `2.1.0-RC8 Release Candidate`.
- Base SQLite incluida: `2.1.0-RC7`.
- `release_tag` interno de base: `2.1.0-rc7`.
- `cache_tag` interno de base: `obradorr-210-rc7-release-candidate`.
- Token de carga web de esta compilación: `obradorr-210-rc8-release-candidate`.

Se mantiene el espacio de datos local de RC7 para no invalidar copias de trabajo compatibles. El parámetro `?v=` cambia para forzar recarga de HTML/CSS/JS.

## Estado

Release candidate integral para prueba final en PC y Termux/Android. No debe considerarse publicación estable hasta superar prueba manual de uso real.

## Regla documental

Ninguna ficha se considera validada por IA ni por importación. La validación real corresponde al profesorado tras prueba de obrador.
