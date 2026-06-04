# RC20 · Cierre menor de impresión PDF

## Objetivo

Aplicar las correcciones menores detectadas tras revisar PDFs reales de RC19, sin tocar la base gastronómica ni modificar la política de validación.

## Cambios aplicados

1. **Pedido consolidado**
   - El encabezado ya no hereda visualmente el perfil auditoría.
   - Se muestra como `Perfil: Pedido consolidado` cuando el tipo de documento es pedido.

2. **Alérgenos**
   - En ficha principal: `Alérgenos directos y derivados consolidados`.
   - En pedido: `Alérgenos globales del pedido`.
   - En subelaboración: `Alérgenos directos y derivados de la subelaboración`.
   - Se evita que un bloque sin alérgenos derivados parezca contradecir los alérgenos propios de un componente sensible.

3. **APPCC en PDF**
   - Se suaviza la regla de salto de página de `.appcc-row-block` para evitar cabeceras APPCC aisladas con grandes huecos.
   - Se mantiene `break-after: avoid-page` en el título APPCC para conservar continuidad visual.

4. **Compatibilidad**
   - Los cambios se aplican a `obradorr-app.js` y `obradorr-app-classic.js`.
   - Se mantiene el cargador clásico compatible con Termux/Android.

## Decisión técnica

RC20 no es una auditoría gastronómica nueva. Es una microversión de impresión:

- No cambia fórmulas.
- No cambia estados gastronómicos.
- No cambia APPCC de base.
- No cambia pedido recursivo.
- No cambia el modelo de perfiles.

## Criterio de aceptación

Debe verificarse que:

- Aula-taller sin costes no imprime columna `Coste`.
- Aula-taller con costes sí imprime columna `Coste`.
- APPCC oculto imprime solo aviso mínimo de seguridad alimentaria.
- APPCC visible imprime tabla breve o completa según perfil.
- Pedido consolidado se identifica como pedido, no como auditoría.
- Auditoría sigue mostrando RC20, Vía B y B1-B4.
