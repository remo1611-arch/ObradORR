# ObradORR · P0-A Corrección de datos críticos, alérgenos y fichas no aptas

Fecha de intervención: 2026-06-03  
Paquete base: ObradORR 1.0.0-rc.6 PUBLIC / public-stable-candidate  
Objetivo de fase: saneamiento quirúrgico inicial para futura línea ObradORR 1.0.0-RC1.  
Estado: **fase corregida, no estable, no RC1 final**.

## Alcance aplicado

- Se mantiene el versionado original `1.0.0-rc.6 / obradorr-100-rc6`.
- Se corrigen datos críticos y se añade `release_status` como estado de calidad documental mínimo.
- No se implementa todavía impresión completa de alérgenos.
- No se implementa todavía APPCC estructurado completo.
- No se unifica todavía pedido JS/SQL.
- No se declara estable la aplicación.

## Esquema SQLite

Se añade una columna mínima no invasiva:

- `culinary_recipes.release_status TEXT NOT NULL DEFAULT 'validada'`
- `bakery_recipes.release_status TEXT NOT NULL DEFAULT 'validada'`

Valores usados en esta fase:

- `validada`
- `pendiente`
- `no_apta`
- `borrador`
- `bloqueante`

Se recrea `v_elaborations_unified` para exponer `release_status` al catálogo.

## Correcciones principales

### Alérgenos

- `HOR031 · Apio`: añadido `ALG_APIO` con `declaration_status='confirmed'`.
- `PAS021 · Gelatina en hojas, cola de pescado`: añadido `ALG_PESCADO` con `declaration_status='pending'` y nota de verificación de origen.

### Panadería / pastelería

- `Pan integral sin gluten con semillas`: eliminada línea de `cerveza`; el porcentaje líquido se transfiere a agua potable. Estado: `pendiente`.
- `Bica de Laza`: retirada levadura panadera; pasa a tratamiento de masa batida/no fermentada. Estado: `pendiente`.
- `Torta de nata`: componente `Crema chantilly` excluido de pedido/coste base por ser decoración opcional. Estado: `pendiente`.
- `Babka chocolate`: eliminada línea directa `Relleno de babka`; se conserva ganache negra como componente. Estado: `pendiente`.
- `Croissant con poolish`: `Crema pastelera` queda como componente opcional excluido de pedido/coste base. Estado: `pendiente`.
- `Larpeira gallega`: se mantiene la ficha panadera como maestra; la ficha culinaria queda archivada para evitar doble fuente de verdad. Estado panadero: `pendiente`.
- `Mezcla de harinas sin gluten base`: marcada como `no_apta` como producto final; conserva utilidad como base técnica.

### Cocina

- `Guacamole`: uva sustituida por lima; proceso técnico específico añadido. Estado: `pendiente`.
- `Tacos de pollo`: proceso actualizado por herencia de guacamole corregido. Estado: `pendiente`.
- `Quiche lorraine`: marcada `no_apta` por usar pasta quebrada dulce; requiere masa salada. Estado: `no_apta`.
- `Ceviche de corvina`: uva sustituida por lima; proceso específico de pescado crudo/marinado añadido. Estado: `pendiente`.
- `Maki básico de salmón y aguacate`: proceso específico añadido; pendiente de validación por pescado crudo y vinagre. Estado: `pendiente`.
- `Pad thai de langostinos`: marcada `no_apta`; requiere reformulación. Estado: `no_apta`.
- `Berenjenas fritas con miel`: ron sustituido por miel multifloral; proceso de fritura añadido. Estado: `pendiente`.
- `Arroz con leche cremoso`: proceso de arroz salado sustituido por proceso de postre lácteo. Estado: `pendiente`.
- `Crema de calabaza`: proceso de pastelería sustituido por proceso de crema/sopa. Estado: `pendiente`.
- `Cordon bleu de pollo`: proceso específico de relleno/empanado/fritura añadido. Estado: `pendiente`.
- `Pechuga villeroy`: proceso específico de cocción/napado/enfriado/empanado/fritura añadido. Estado: `pendiente`.
- `Falafel`: proceso específico de remojo/triturado/formado/fritura añadido. Estado: `pendiente`.

### Residuos de prueba

- `probando`: archivado, activo=0, `release_status='no_apta'`, texto residual saneado.
- `ejemplo`: archivado, activo=0, `release_status='no_apta'`, texto residual saneado.

## Validaciones esperadas

- `PRAGMA integrity_check = ok`
- `PRAGMA foreign_key_check = 0 errores`
- sin recetas activas sin líneas
- sin líneas con ingredientes inválidos
- `HOR031` contiene `ALG_APIO`
- ninguna receta activa con “sin gluten” contiene ingrediente con `ALG_GLUTEN` confirmado
- `probando` y `ejemplo` no están activos
- `Larpeira gallega` solo queda activa como ficha panadera

## Pendiente fuera de P0-A

- Impresión completa de alérgenos derivados.
- APPCC docente estructurado.
- Pedido JS/SQL equivalente.
- Prefermentos completos en poolish/biga.
- Rendimientos panaderos definitivos.
- Persistencia/autoguardado y reset/importación reforzados.
- Prueba real Windows y Termux.
- Versionado final RC1.
