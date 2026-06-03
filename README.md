# ObradORR 1.0.0-rc.2

Aplicación web local/offline para uso docente en Formación Profesional de Cocina, Pastelería y Panadería.

## Autoría y uso

© 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.

Esta versión es una release candidate. No es versión estable final.

## Núcleo funcional

Elaboraciones → selección docente → cálculo → ficha técnica / pedido → impresión → sesión guardada → reutilización.

ObradORR no es un ERP, TPV, sistema de stock real, SaaS ni plataforma con login. Está pensado para aula-taller, Windows, Android/Termux y trabajo offline.

## Arranque rápido

Desde la raíz del proyecto:

```bash
python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc2
```

Si venías de una versión anterior o queda una recuperación local antigua:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc2
```

## Cambios principales de la 2.0 candidata

- Metadatos SQLite normalizados a `1.0.0-rc.2`.
- `schema_migrations` incorporada.
- Edición guiada ampliada: ficha, líneas, prefermento, pasos técnicos y componentes elaborados.
- Operaciones críticas reforzadas con transacciones SQLite.
- Control preventivo de ciclos en subrecetas culinarias y componentes panaderos.
- Componentes semilla para validar Babka, Croissant y Torta de nata.
- Registro automático de trabajos de impresión en `print_jobs`.
- Diagnóstico ampliado en Sistema.
- Regresión bloqueante: Torta de nata no puede tener nata o azúcar a 0 g.
- Impresión por iframe; no se usa `window.open`.

## Límites conocidos

Esta versión mantiene el cargador clásico monolítico por compatibilidad. La arquitectura por carpetas queda preparada y documentada, pero no se ha hecho una reescritura greenfield completa en módulos ES para evitar regresiones de arranque en Android/Termux.

La validación automática incluida cubre sintaxis JS, SQLite, metadatos, componentes, regresión de Torta de nata, presencia de iframe y ausencia de `window.open`. Aun así, antes de uso real en aula conviene abrir la app en navegador, generar fichas + pedido y guardar una sesión de prueba.
