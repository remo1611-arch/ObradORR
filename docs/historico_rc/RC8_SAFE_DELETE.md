# ObradORR 2.1.0-RC8 · Safe Delete Hotfix

Parche limitado de cierre sobre RC8 FINAL LAYOUT FIX.

Cambios:
- Alta de elaboraciones mediante formulario con Cancelar; no se crea ningún registro hasta pulsar Crear y editar.
- Alta de ingredientes mediante formulario con Cancelar; no se crea ningún registro hasta pulsar Crear y editar.
- Eliminación segura de elaboraciones desde el editor: bloqueada si la ficha está en uso como subreceta, componente, sesión actual o sesión guardada.
- Eliminación segura de ingredientes desde el editor: bloqueada si aparece en líneas culinarias o fórmulas panaderas/pasteleras.
- Sin cambios en SQLite, recetas, ingredientes, APPCC, alérgenos, costes ni motor de impresión.
