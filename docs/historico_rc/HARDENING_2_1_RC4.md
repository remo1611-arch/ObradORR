# ObradORR 2.1.0-RC7 · Hardening de bases

Esta RC5 blinda la gestión de bases antes de iniciar las mejoras Excel.

## Cambios aplicados

1. **Copia previa obligatoria en acciones destructivas**
   - Usar base incluida en la aplicación.
   - Crear base nueva limpia.
   - Restaurar SQLite sustituyendo.

2. **Importación combinada alineada a 2.1**
   - `import-merge.js` actualizado a versión interna 2.1.
   - Política explícita: no sobreescribir, no validar por importación, conflictos como variantes.
   - `recipe_documentary_reviews` se importa como cobertura documental, no como validación de obrador.
   - `workshop_validation_log` se importa solo como evidencia histórica si la ficha destino se identifica de forma inequívoca.
   - `media_assets` y `recipe_media` se contemplan de forma conservadora.
   - `recipe_photos` con rutas externas se omite para evitar referencias rotas.

3. **Metadatos saneados**
   - `app_meta` queda coherente con 2.1.0-RC7.
   - Eliminadas claves antiguas/confusas de 2.0, ramas experimentales y etiquetas de caché antiguas.

4. **Versiones internas normalizadas**
   - Módulos activos pasan a versión 2.1.
   - Exportaciones JSON pasan a esquema 2.1-RC5.

5. **Limpieza de código muerto seguro**
   - Eliminada la función antigua `addRecipeToSelection()`, que podía saltarse el modal de cantidad.

6. **Documentación histórica archivada**
   - Registros de validación antiguos movidos a `docs/archive/`.

## No modificado

- Fórmulas.
- Ingredientes.
- Cantidades base.
- APPCC/alérgenos.
- Motor recursivo.
- Pedido consolidado.
- Impresión/PDF.
- Escalado de producción.
- Estados de validación de fichas.
