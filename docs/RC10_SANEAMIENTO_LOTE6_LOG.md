# RC10 · Saneamiento documental del Lote 6

Aplicado sobre ObradORR 1.0.0-rc.9 para generar ObradORR 1.0.0-rc.10.

## Alcance

RC10 es una versión de saneamiento documental de cocina caliente de producción. No reformula recetas, no inventa rendimientos, no cierra relaciones arroz/líquido, no estima absorciones de aceite y no declara estable ninguna ficha sin prueba de obrador.

## Cambios aplicados

- Actualización de versión, `app_meta`, cache tag y release tag a `1.0.0-rc.10`.
- Paso a `pendiente` de fichas culinarias del Lote 6 que figuraban como `validada` pero dependen de subrecetas pendientes, conservación no validada, emulsiones técnicas, frituras, arroces o procesos de producción caliente sin prueba real.
- Refuerzo de notas visibles en fichas con:
  - subreceta recursiva;
  - alérgenos derivados incluidos;
  - coste directo distinto de coste recursivo;
  - relación arroz/líquido pendiente;
  - fondo/fumet/salsa pendiente;
  - bechamel sensible/refrigerada;
  - mayonesa sensible/refrigerada;
  - emulsión técnica;
  - aceite como medio de fritura;
  - mantenimiento caliente, enfriado rápido o regeneración pendiente.
- Corrección de las líneas de aceite de `REC-CHURROS` y `REC-CROQUETAS-JAMON` para declararlas como medio de fritura/pedido, no consumido íntegramente, con absorción pendiente de prueba de obrador.
- Refuerzo de avisos de impresión en `sheetStatusWarningHtml` para Lote 6.

## Fichas pasadas a pendiente

- Albóndigas en salsa española.
- Arroz al horno.
- Arroz con chocos.
- Arroz del señoret.
- Arroz marinero con fumet.
- Arroz negro.
- Arroz pilaf.
- Bacalao a la vizcaína.
- Bacalao ajoarriero.
- Bacalao al pil-pil.
- Caldeirada de merluza.
- Churros.
- Croquetas de jamón.
- Ensaladilla rusa.
- Espagueti a la carbonara.
- Lasaña boloñesa.
- Merluza a la gallega.
- Merluza en salsa verde.
- Migas extremeñas.
- Paella valenciana.
- Pesto genovés.
- Pimientos del piquillo rellenos de bacalao.
- Pollo al curry con arroz basmati.
- Pollo en pepitoria.
- Pollo teriyaki con arroz.
- Porrusalda.
- Risotto de boletus.
- Risotto de setas y parmesano.
- Salsa boloñesa.
- Solomillo con salsa madeira y puré.
- Suquet de pescado.
- Tagliatelle al pesto.
- Xarrete de ternera glaseado con demi-glace.

## Límites

- No se han corregido fórmulas completas.
- No se han validado fichas bibliográficamente como definitivas.
- No se han validado fichas en obrador.
- El APPCC sigue siendo docente mínimo y no sustituye el manual APPCC del centro.
- Las fichas pendientes pueden usarse como material de trabajo, no como formulaciones cerradas.
