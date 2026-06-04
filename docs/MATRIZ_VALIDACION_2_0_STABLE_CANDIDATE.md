# Matriz de validación manual · ObradORR 2.0.0 STABLE-CANDIDATE

| Bloque | Prueba | Resultado esperado |
|---|---|---|
| Arranque | Abrir `app/obradorr.html` con cache tag stable | Carga sin error JS |
| Reset | Abrir `reset_local_data.html` | Limpia datos locales y permite volver a abrir |
| Ficha simple | Imprimir Ajoblanco | Foto derecha, APPCC breve compacto |
| Ficha recursiva | Imprimir Albóndigas/Salsa española | Subrecetas y alérgenos derivados coherentes |
| Perfil aula | PDF aula-taller | Documento compacto, sin preflight invasivo |
| Perfil auditoría | PDF auditoría | Trazabilidad completa conservada |
| Pedido | Pedido consolidado | Agrupación por familia y alérgenos globales |
| Exportación | CSV/TSV/JSON/ZIP | Nombre ISO con segundos |
| Backup | SQLite/JSON/ZIP | Copia generada; fallback si no hay carpeta |
| Importación | Importar y combinar base compatible | Backup previo, informe, no sobreescritura |
| Editor | Duplicar/crear variante/guardar borrador | No rompe ficha original |
| Estados | Fichas activas validada | 0 |
