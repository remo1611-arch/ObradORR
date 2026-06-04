# ObradORR 1.0.0-rc.7

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

    1.0.0-rc.7

Canal:

    release candidate / pre-release

No debe considerarse versión estable final hasta completar prueba real de uso docente.

## Cambios principales de rc.6

- Corrección gastronómica-documental P0 derivada de auditoría de los Lotes 1A + 1B.
- APPCC de Bavaroise, Panna cotta y Tarta fría reclasificado como frío lácteo/semifrío, no como pescado cocinado.
- Gelatina “cola de pescado” mantiene pescado como alérgeno pendiente, separado del APPCC.
- Ceviche y Maki mantienen estado pendiente por materia prima apta para crudo/control anisakis.
- Pan integral sin gluten con semillas elimina residuos textuales de cerveza/gluten como ingrediente incorporado.
- Fichas no aptas permanecen bloqueadas: Pad thai, Quiche lorraine y Mezcla de harinas sin gluten base.
- Frituras documentan aceite como medio de fritura/pedido y absorción pendiente de prueba de obrador.
- Torta de nata, Croissant con poolish y Panettone modernista simplificado siguen pendientes fuertes por prefermento/rendimiento.
- La impresión muestra avisos de ficha pendiente/no apta, rendimiento pendiente y prefermento pendiente.

## Límites conocidos

No se han inventado pesos cocidos, mermas, absorciones de aceite, tiempos/temperaturas de prefermentos, Bloom de gelatina ni datos de proveedor.

Los rendimientos panaderos y algunos prefermentos siguen marcados como pendientes de prueba de obrador cuando no hay datos reales suficientes.

El APPCC incluido es un modelo docente mínimo. No sustituye el manual APPCC del centro ni las fichas técnicas de proveedor.

## Releases

Las versiones descargables están disponibles en:

https://github.com/remo1611-arch/ObradORR/releases

## Nota RC7

RC7 refuerza el saneamiento documental del Lote 3: centenos altos, panes formulados sin ingredientes con gluten, contacto cruzado, Dosa/Idli como batidos fermentados y fermentación espontánea pendiente de control docente. No valida fórmulas ni rendimientos.
