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
- Escalado de producción: raciones/rendimiento para fichas ordinarias y piezas+peso, masa/pasta total o harina total para formulación.

## Límites

- No valida rendimientos reales de obrador.
- No declara pesos cocidos ni mermas como datos cerrados sin prueba docente.
- La recuperación local depende del navegador, dispositivo y puerto/origen.
- Para mover datos entre PC y móvil se recomienda exportar/importar copia SQLite.
