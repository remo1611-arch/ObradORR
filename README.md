# ObradORR 2.1.0-RC9 · Release Candidate

Aula taller digital offline para cocina, pastelería y panadería.

ObradORR permite trabajar con fichas técnicas, ingredientes, subelaboraciones, pedido de producción, alérgenos, APPCC docente, modelos de impresión, escandallos, escalado de producción y copias SQLite sin depender de servidor externo.

## Estado de la versión

- Versión: `2.1.0-RC9`.
- Canal: `release candidate`.
- Token de carga web: `obradorr-210-rc9-release-candidate`.
- Ejecución: navegador moderno con servidor local desde la raíz del proyecto.
- Base incluida: SQLite local.
- Fuente de verdad: `db/obradorr.sqlite`.

## Navegación principal

Inicio · Sesión actual · Sesiones guardadas · Elaboraciones · Ingredientes · Validación de obrador · Sistema

## Modelos de impresión

Los modelos se nombran por finalidad documental, no por nivel educativo:

- **Ficha de trabajo**: ingredientes, cantidades, foto si existe y proceso esencial. Sin escandallo.
- **Ficha técnica**: documento ordinario de práctica con proceso, alérgenos, conservación/servicio y subelaboraciones resumidas.
- **Ficha técnica ampliada**: documento técnico de preparación de práctica con APPCC, subelaboraciones desarrolladas, observaciones técnicas y costes estimados.
- **Dossier completo de producción**: documento completo con escandallo, costes, APPCC, validación documental y trazabilidad técnica.

El antiguo `Pedido` queda normalizado como **Pedido de producción**.

## Uso básico

1. Descomprime el ZIP o clona el repositorio.
2. Arranca un servidor local desde la raíz del proyecto.
3. Abre `index.html` o `app/obradorr.html` en el navegador.
4. Prepara la práctica en **Sesión actual**.
5. Genera la vista de impresión y guarda PDF si procede.
6. Después de cambios importantes, descarga una copia `.sqlite` desde **Sistema**.

## Límites importantes

SQLite sigue siendo la fuente de verdad. Excel, CSV y JSON son salidas de auditoría, respaldo o revisión externa; no son formatos maestros de edición.

Las fichas son propuestas documentales. La validación real de rendimiento, textura, merma, tiempos y aceptación organoléptica corresponde al profesorado tras prueba en obrador.

## Documentación

- `GUIA_TERMUX.md`
- `GUIA_WINDOWS.md`
- `BACKUPS.md`
- `EXPORTACIONES.md`
- `IMPORTACION_SEGURA.md`
- `VALIDACION_OBRADOR.md`
- `docs/print_refactor/`

## Autoría

© 2026 Remo José Pereira González. Uso docente personal autorizado. Sin licencia abierta de redistribución o explotación comercial salvo permiso expreso.
