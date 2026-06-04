# RELEASE NOTES · ObradORR 1.0.0-rc.21

## Alcance

RC21 es una refactorización conservadora de cierre técnico sobre RC20. No cambia fórmulas, rendimientos, alérgenos ni validaciones gastronómicas. Su objetivo es dejar el motor documental más ordenado antes de seguir con pruebas PDF o revisión de fichas.

## Cambios técnicos

- Separación explícita del flujo de impresión en tres fases: modelo de documento, render HTML y presentación/registro.
- Eliminación de funciones internas no utilizadas detectadas en `app/js/obradorr-app.js`.
- Limpieza de clases CSS/versionadas en avisos documentales de impresión.
- Reordenación mediante secciones internas del bloque de impresión: perfiles, fichas culinarias, fichas panaderas y pedido consolidado.
- Actualización de documentación de perfiles de salida.
- Limpieza de documentación interna: notas históricas en `docs/releases/` y reportes de validación en `docs/validation/`.
- Changelog reescrito en formato limpio y trazable.

## Decisiones mantenidas

- Todas las fichas siguen como propuesta documental pendiente o no apta, salvo validación docente posterior real.
- `Mostrar costes` y `Mostrar APPCC docente` se conservan como opciones manuales efectivas.
- El pedido consolidado sigue siendo documento operativo separado de auditoría.
- No se inventan pesos cocidos, mermas, tiempos, reducciones, absorciones de aceite ni datos de proveedor.

## Pruebas recomendadas

Generar de nuevo los PDF de control:

1. Aula-taller sin costes y sin APPCC.
2. Aula-taller con costes.
3. Docente producción con APPCC.
4. Auditoría documental completa.
5. Pedido consolidado.
