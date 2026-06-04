# RC25-DATA4 · Panadería/pastelería y fichas culinarias puente

## Alcance

Intervención de datos sobre 13 fichas de panadería/pastelería localizadas en `culinary_recipes` durante el Lote 7D. No se migran a `bakery_recipes` para no alterar recursividad, selección de prácticas ni compatibilidad de impresión. No se modifica motor, CSS ni perfil documental.

## Fichas tratadas

- REC-FOCACCIA
- REC-MASA-EMPANADA
- REC-MASA-PIZZA
- REC-PAN-BASICO
- REC-PAN-GALLEGO
- REC-PAST-ALMIBAR-30
- REC-PAST-MANZANA-COMPOTA
- REC-PAST-GENOVES
- REC-PAST-BIZCOCHO-PLANCHA
- REC-PAST-QUEBRADA-DULCE
- REC-PAST-HOJALDRE-BASE
- REC-PAST-MERENGUE-FRANCES
- REC-PAST-MERENGUE-ITALIANO

## Decisiones

1. Se conservan como fichas puente/auxiliares en `culinary_recipes`.
2. Se normalizan procesos técnicos: amasado, fermentación, formado, laminado, sablage/fonzado, montado, plegado, secado, conservación y uso como componente.
3. Se corrige `REC-PAST-ALMIBAR-30`: relación azúcar/agua a 300 g / 700 g como 30 °Brix orientativo antes de evaporación. El Brix real queda pendiente de refractómetro.
4. Todas las fichas mantienen `release_status='pendiente'`.
5. Se añaden revisiones documentales `REV_RC25_DATA4_*` con `obrador_validation_required=1`.
6. No se declaran rendimientos, mermas, pesos cocidos, capas de hojaldre, textura ni fermentaciones como validadas.

## Límite documental

Esta versión contrasta y depura documentación técnica, pero no valida obrador. La validación real de rendimiento, textura, merma, fermentación, laminado, secado, punto de cocción y conservación corresponde al profesorado tras prueba práctica.
