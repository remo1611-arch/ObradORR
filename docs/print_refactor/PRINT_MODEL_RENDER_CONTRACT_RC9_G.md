# Contrato de render por modelo · RC9-K

El render de fichas debe consultar `opts.printBlocks` antes de mostrar bloques sensibles.

## Bloques controlados

- `photo`
- `process`
- `allergens`
- `appcc`
- `subrecipes`
- `costs`
- `escandallo`
- `validation`
- `traceability`
- `conservation`

## Reglas de seguridad

1. La validación documental completa solo aparece en el dossier completo o cuando el modelo ampliado activa costes.
2. Las incidencias críticas (`no_apta`, `bloqueante`) se muestran siempre.
3. El APPCC puede ser `none`, `brief` o `complete`.
4. Los costes se reservan para modelos avanzados o completos.
5. La trazabilidad técnica queda reservada para el dossier completo.
