# Notas de versión · ObradORR 2.0.0

Versión pública estable preparada para uso docente local/offline.

## Incluye

- Fichas técnicas de cocina, pastelería y panadería.
- Pedido consolidado con ingredientes recursivos.
- Declaración de alérgenos directos y derivados limitada a los 14 grupos normativos.
- Perfiles documentales: aula-taller, FPB, CM, GS, docente, pedido y auditoría.
- Editor con duplicación, variantes, borrador local y avisos de impacto.
- Copias SQLite, JSON, CSV, TSV y ZIP de práctica.
- Importación combinada segura entre bases ObradORR compatibles.
- Persistencia local con IndexedDB y snapshots rotatorios.
- Escalado de producción: raciones/rendimiento para fichas ordinarias y piezas+peso, masa total o harina total para formulación.

## Límites

- No valida rendimientos reales de obrador.
- No declara pesos cocidos ni mermas como datos cerrados sin prueba docente.
- La recuperación local depende del navegador, dispositivo y puerto/origen.
- Para mover datos entre PC y móvil se recomienda exportar/importar copia SQLite.

## 2.0.0 · Microcierre editorial final

- Se sustituye en la portada de auditoría una referencia interna de desarrollo por “avisos documentales”.
- Se normaliza la puntuación de notas APPCC visibles del tipo “Modelo docente mínimo. Ficha pendiente…”.
- No se han modificado fórmulas, cantidades, motor de escalado, impresión, backup/import/export ni estructura SQLite.
- Microajuste terminológico final: “masa total”, “masa cruda” y tipo real de prefermento en bloques panaderos.

## Mejora final de selección e impresión

- Los listados de elaboraciones, ingredientes e impresión mantienen una carga inicial ligera y añaden opciones **Mostrar más** y **Mostrar todas**.
- Al añadir una elaboración individual a impresión se solicita la cantidad de producción.
- Las fichas ordinarias se añaden por raciones o rendimiento.
- Las formulaciones se añaden por piezas con peso unitario, masa total o harina total.
- En impresión/exportación se pueden añadir elaboraciones visibles, filtradas o todo el catálogo con confirmación.
- La selección permite revisar y ajustar cantidades antes de generar PDF, pedido o exportaciones.

