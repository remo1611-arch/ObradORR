# ObradORR 1.0.0-rc.27-data5-7 · RC27-DATA5-7 · Refinamiento integral contrastado

## Alcance

RC27-DATA5-7 parte de RC26 y ejecuta una macrofase única de datos/documentación:

- DATA5: refinamiento no bloqueante de fichas B/C/P1/P2/P3 del Lote 7.
- DATA6: revisión técnica de panadería/pastelería real en `bakery_recipes`.
- DATA7: revisión transversal de APPCC y alérgenos por familias de riesgo.

## Reglas aplicadas

- No se marca ninguna ficha como `validada`.
- `release_status='pendiente'` se mantiene como norma general.
- `yield_status='pending'` se mantiene en panadería/pastelería.
- No se inventan rendimientos, mermas, pesos cocidos, absorciones ni validaciones sensoriales.
- No se migra ningún registro entre `culinary_recipes` y `bakery_recipes`.
- No se toca motor ni impresión.

## DATA5 · Refinamiento no bloqueante

Fichas culinarias con intervención documental DATA5: **116**.

Cambios específicos de fórmula/denominación no bloqueantes: **12**.

Ejemplos:

- REC-FABADA-ASTURIANA: alubia blanca riñón -> faba asturiana
- REC-TORTILLA-PAISANA: guisantes con vaina -> guisantes finos congelados
- REC-TORTILLA-PAISANA: sal común añadida como sazonamiento pendiente de prueba
- REC-OLLA-GITANA: melocotón -> pera conferencia
- REC-ZORZA-PATATAS: carne picada de cerdo -> aguja de cerdo troceable
- REC-ZORZA-PATATAS: aceite del adobo -> aceite de oliva virgen
- REC-CALLOS-GALLEGOS: jamón cocido -> chorizo de cebolla
- REC-COCIDO-MONTANES: jamón cocido -> costilla salada
- REC-COCIDO-MONTANES: morcilla de Burgos -> chorizo de cebolla
- REC-JUDIONES-GRANJA: jamón cocido -> chorizo de León curado picante
- REC-RANCHO-CANARIO: jamón cocido -> chorizo de curación media ahumado
- REC-ZAMBURINAS-GRATINADAS: renombrada para no declarar zamburiña fresca cuando el ingrediente es volandeira comercial

## DATA6 · Panadería/pastelería real

Fichas `bakery_recipes` revisadas: **97**.

Se añadieron notas de control técnico por familia: panes directos, prefermentos, masa madre, centenos, sin gluten, alta hidratación, masas enriquecidas y laminados. Los porcentajes panaderos se usan como criterio documental, no como validación de obrador.

## DATA7 · APPCC/alérgenos

Filas de matriz APPCC/alérgenos: **301**.

Se homogeneizaron advertencias para:

- huevo/ovoproductos y emulsiones;
- pescado/marisco/anisakis;
- arroz y cereales cocidos;
- lácteos, nata, cremas y semifríos;
- frituras y contaminación cruzada;
- cocciones largas y regeneración;
- alérgenos directos y derivados por subrecetas.

## Fuentes marco

- Reglamento (CE) 852/2004.
- Reglamento (CE) 2073/2005.
- Reglamento (UE) 1169/2011.
- Real Decreto 1021/2022.
- AESAN: anisakis y criterios tiempo-temperatura.
- Bibliografía técnica gastronómica/panadera ya incorporada en el proyecto.

## Límites

RC27-DATA5-7 no sustituye DATA8. La validación de rendimiento, textura, merma, peso cocido, punto de fermentación y aceptación organoléptica sigue requiriendo prueba real por profesorado en obrador.
