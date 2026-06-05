# Release notes · ObradORR 2.1.0-RC8 Release Candidate

## Criterio de cierre

RC8 cierra la fase de refinamiento de ObradORR 2.1.0. No añade cambios gastronómicos ni modifica la base SQLite incluida; consolida interfaz, edición, seguridad de borrado, ayuda y validación de entrega.

## Cambios consolidados desde RC7

- Catálogo Excel corregido y tratado como exportación técnica, no como editor.
- Importación y plantilla Excel retiradas de la interfaz.
- Navegación final: Inicio, Sesión actual, Sesiones guardadas, Elaboraciones, Ingredientes, Validación de obrador, Sistema.
- Cabecera compacta en móvil y reorganizada en PC.
- Pestaña Sesión actual reorganizada como flujo docente.
- Subelaboraciones culinarias corregidas para evitar cortes de palabra/solapamientos.
- Sistema revisado tras regresión visual, manteniendo una solución conservadora.
- Editores de elaboraciones e ingredientes más amplios y adaptativos.
- Alta cancelable de elaboraciones e ingredientes.
- Eliminación segura de elaboraciones e ingredientes con comprobación de uso.
- Guía de uso plegada en Inicio.

## Política documental

- Las fichas nuevas o generadas se mantienen como propuestas documentales.
- La validación real corresponde al profesorado tras prueba de obrador.
- `recipe_documentary_reviews` y registros equivalentes no sustituyen la comprobación práctica.
- SQLite es la fuente de verdad; Excel/CSV/JSON son salidas de auditoría, consulta o respaldo.

## Prueba mínima antes de estable

1. Abrir con servidor local, no con `file://`.
2. Ejecutar `app/reset_local_data.html` si se viene de versiones anteriores.
3. Crear una elaboración de prueba, cancelar otra alta y eliminar la creada.
4. Crear un ingrediente de prueba, cancelar otra alta y eliminar el creado.
5. Confirmar bloqueo de eliminación cuando el registro está en uso.
6. Añadir elaboración a Sesión actual.
7. Generar vista previa / PDF.
8. Guardar y recuperar una sesión.
9. Descargar copia SQLite.
10. Exportar catálogo Excel/CSV/JSON técnico.

## Límites conocidos

- La salida PDF depende del motor de impresión del navegador.
- Las exportaciones técnicas no son formatos maestros de edición.
- La base mantiene metadatos internos RC7 por compatibilidad documental y de persistencia.
