# P0-G1 · Microajustes UX detectados en prueba Windows

Fase quirúrgica aplicada sobre P0-F.

No se ha cambiado el versionado interno, no se ha generado estable y no se han modificado datos gastronómicos, APPCC, alérgenos, pedido JS/SQL ni persistencia.

## Correcciones aplicadas

1. **Filtrado ciclo → módulo**
   - Los módulos se filtran por el ciclo seleccionado en los datos docentes de impresión.
   - Si no hay ciclo seleccionado, se muestran todos los módulos con nota de ayuda.
   - Si cambia el ciclo y el módulo anterior ya no corresponde, se limpia el módulo.
   - Al guardar sesión, el módulo solo se asocia si pertenece al ciclo seleccionado.

2. **Límite mostrado en búsquedas**
   - Elaboraciones: se muestra `Mostrando X de Y resultados`.
   - Ingredientes: se muestra `Mostrando X de Y activos` y aviso cuando se limita a los primeros 220.
   - Buscador de impresión: se muestra `Mostrando X de Y resultados` y aviso cuando se limita a los primeros 60.

3. **Opciones de subrecetas dentro de sus cuadros**
   - Las tarjetas de radio se han reforzado con CSS grid.
   - Título y descripción quedan dentro del contenedor.
   - Se añade envoltura de texto robusta para escritorio y móvil.

## Archivos modificados

- `app/js/obradorr-app-classic.js`
- `app/js/obradorr-app.js`
- `app/css/obradorr.css`
- `docs/P0G1_UX_WINDOWS_HOTFIX_LOG.md`

## Fuera de alcance

- Versionado final RC1.
- APPCC completo.
- Alérgenos.
- Pedido JS/SQL.
- Persistencia/autoguardado/importación/reset.
- Datos gastronómicos.
