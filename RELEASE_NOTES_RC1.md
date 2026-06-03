# ObradORR 1.0.0-rc.1

Primera release candidate pública de ObradORR.

## Qué es

ObradORR es una aplicación web local/offline para uso docente en Formación Profesional de Cocina, Pastelería y Panadería.

Funciona con HTML, CSS, JavaScript Vanilla, SQLite WASM y una base SQLite local incluida.

## Estado de la versión

Esta versión es release candidate.

No es una versión estable final.

## Ejecución local recomendada

Descomprimir el ZIP y ejecutar desde la carpeta raíz:

python -m http.server 8807 --bind 127.0.0.1

Abrir en el navegador:

http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc1

## Requisitos mínimos

- Navegador moderno: Chrome, Edge o equivalente.
- Python para servidor local.
- En Android/Termux: python y unzip. Node/coreutils solo para validación si se desea.

## Cambios principales

- Datos críticos corregidos.
- Apio declarado como alérgeno.
- Gelatina “cola de pescado” marcada como pendiente de verificación.
- Fichas críticas corregidas o marcadas.
- Componentes panaderos normalizados como obligatorios/opcionales.
- Prefermentos y rendimientos pendientes marcados explícitamente.
- Alérgenos derivados en fichas y pedido.
- APPCC docente mínimo estructurado.
- Pedido consolidado coherente entre JS/SQL.
- Persistencia, importación y reset reforzados.
- Ajustes UX en Windows y Android.
- Fotos de ficha limitadas para no dominar la documentación.

## Advertencia docente

El APPCC incluido es un modelo docente mínimo. No sustituye el manual APPCC del centro ni las fichas técnicas de proveedor.

## SHA256 del ZIP

d5aaed9cc162f6c4a166e4a9ed4025e0b5f7399e03700871d37765ef9226a7bb

## Riesgos pendientes

- RC1 debe validarse en uso real antes de declararse estable.
- Rendimientos panaderos y prefermentos marcados como pendientes requieren prueba de obrador.
- La revisión APPCC fina ficha a ficha queda para 1.0 estable / 1.1.
