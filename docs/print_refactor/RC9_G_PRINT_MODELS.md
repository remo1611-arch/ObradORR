# RC9 · Subelaboraciones, panadería y escandallo por modelo

Esta fase aplica de forma efectiva la matriz de modelos documentales definida en RC9-C sobre el render de fichas.

## Criterio aplicado

- **Ficha de trabajo**: salida simple, sin APPCC detallado, sin escandallo y sin subfichas desarrolladas.
- **Ficha técnica**: salida ordinaria, con subelaboraciones resumidas/ingredientes y APPCC breve cuando exista.
- **Ficha técnica ampliada**: admite subfichas desarrolladas y costes/escandallo si el docente activa costes.
- **Dossier completo de producción**: incluye costes, escandallo, validación documental y trazabilidad técnica.

Los modelos se nombran por finalidad documental, no por ciclo formativo ni por nivel del alumnado.

## Subelaboraciones culinarias

- `none`: mantiene la referencia directa a la subelaboración.
- `ingredients`: expande ingredientes recursivos y añade resumen de subelaboraciones necesarias.
- `sheets`: imprime subfichas, evitando duplicados y ciclos.

## Panadería y pastelería

Los bloques de fórmula panadera se mantienen diferenciados: prefermento, masa final, rellenos, coberturas, decoración y otros. Los componentes elaborados se muestran como resumen o como subficha según el modelo.

## Escandallo

El escandallo se define como **escandallo técnico docente**. No incluye mano de obra, energía, gastos generales, margen comercial ni IVA.
