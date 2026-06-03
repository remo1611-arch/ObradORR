# ObradORR 1.0.0-rc.4

Aplicación web local/offline para uso docente en Formación Profesional de Cocina, Pastelería y Panadería.

## Usar ObradORR online

Abrir directamente desde GitHub Pages:

https://remo1611-arch.github.io/ObradORR/

Esta URL carga la versión publicada actualmente en la rama `main`.

Si la app no arranca después de haber probado versiones anteriores, usa primero el reset local:

https://remo1611-arch.github.io/ObradORR/app/reset_local_data.html

Después vuelve a abrir:

https://remo1611-arch.github.io/ObradORR/

## Uso local/offline recomendado

También puedes descargar el ZIP de la release, descomprimirlo y ejecutar ObradORR desde tu propio dispositivo.

Desde la raíz del proyecto:

    python -m http.server 8807 --bind 127.0.0.1

Después abrir:

    http://127.0.0.1:8807/app/obradorr.html

La dirección `127.0.0.1` solo funciona en el dispositivo donde se ha arrancado el servidor local. No es una URL pública.

## Autoría y uso

© 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.

Esta versión es una release candidate. No es versión estable final.

## Núcleo funcional

Elaboraciones → selección docente → cálculo → ficha técnica / pedido → impresión → sesión guardada → reutilización.

ObradORR no es un ERP, TPV, sistema de stock real, SaaS ni plataforma con login. Está pensado para aula-taller, Windows, Android/Termux y trabajo offline.

## Estado de la versión

Versión actual:

    1.0.0-rc.4

Canal:

    release candidate / pre-release

No debe considerarse versión estable final hasta completar prueba real de uso docente.

## Cambios principales

- Metadatos SQLite normalizados a `1.0.0-rc.4`.
- Alérgenos derivados en fichas y pedido.
- APPCC docente mínimo estructurado.
- Pedido consolidado coherente entre JS/SQL.
- Persistencia, importación y reset reforzados.
- Componentes panaderos normalizados como obligatorios/opcionales.
- Prefermentos y rendimientos pendientes marcados explícitamente.
- Pie legal visible en app e impresión.
- Corrección de coherencia interna de versión/cache/IndexedDB.
- Fotos de ficha limitadas para no dominar la documentación.

## Límites conocidos

Esta versión mantiene el cargador clásico monolítico por compatibilidad.

Los rendimientos panaderos y algunos prefermentos siguen marcados como pendientes de prueba de obrador cuando no hay datos reales suficientes.

El APPCC incluido es un modelo docente mínimo. No sustituye el manual APPCC del centro ni las fichas técnicas de proveedor.

## Releases

Las versiones descargables están disponibles en:

https://github.com/remo1611-arch/ObradORR/releases
