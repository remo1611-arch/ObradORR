# Changelog

## 2.1.0-RC9-F · Print View

- Añadida vista independiente de impresión `app/print-view.html`.
- Conservado fallback al visor integrado clásico.
- Actualizado token de caché a `obradorr-210-rc9-release-candidate`.
- Sin cambios en SQLite ni datos gastronómicos.

# CHANGELOG

## 2.1.0-RC7 · Release candidate integral

- Integración final de RC4, RC5 y RC6 para prueba global.
- Metadatos y cache tag actualizados a `2.1.0-rc7` / `obradorr-210-rc7-release-candidate`.
- Documentación de cierre RC7.
- Sin cambios gastronómicos, sin cambios de fórmulas y sin validación automática de fichas.

## 2.1.0-RC6 · Excel import altas

- Importación segura de plantilla Excel para altas nuevas.
- Staging, backup obligatorio y transacción SQLite.

## 2.1.0-RC5 · Excel export

- Exportación de catálogo completo XLSX.
- Exportación de plantilla vacía XLSX.

## 2.1.0-RC4 · Hardening de bases

- Backup obligatorio en acciones destructivas.
- app_meta saneado.
- import-merge alineado a 2.1.

## 2.1.0-RC7 · Excel hotfix 1

- Fix: exportación `Catálogo Excel` no debe fallar con `1st ORDER BY term does not match any column in the result set`.
- Alcance: solo `app/js/export/export-tools.js` y cache-busting HTML/guías.

## 2.1.0-RC7 · Excel Hotfix 2

- Corregida la consulta de `03_INGREDIENTES` en el catálogo Excel completo: `v_ingredients_cost` no contiene `notes`; se obtienen desde `ingredients.notes` mediante `LEFT JOIN`.
- Añadida regresión de exportación Excel completa en `tools/validate_release.py`.

## 2.1.0-RC7 · Exportaciones discretas

- UX: las exportaciones técnicas pasan a un bloque plegado por defecto en Sistema y copias.
- Se retiran de la interfaz y del cargador principal la plantilla Excel vacía y la importación desde Excel.
- No se modifica la base SQLite ni los datos gastronómicos.

## 2.1.0-RC8 · Refinamiento HTML/UX

- Parche limitado a interfaz y comodidad de edición.
- No modifica la base SQLite ni datos gastronómicos.
- Editores de elaboraciones e ingredientes más amplios y adaptativos.
- Textareas autoajustables para proceso, notas y observaciones técnicas.
- Tablas de edición convertidas en tarjetas en móvil.
- Importación Excel sigue retirada; exportaciones técnicas permanecen discretas y plegadas.

## 2.1.0-RC8 · Header/Nav Hotfix

- Encabezado más compacto en móvil.
- Navegación reordenada para el flujo docente: Inicio, Sesión actual, Sesiones guardadas, Elaboraciones, Ingredientes, Validación de obrador, Sistema.
- No modifica la base SQLite ni los datos gastronómicos.


## ObradORR 2.1.0-RC8 · Header Status Hotfix

- Cabecera de escritorio reordenada: marca en línea superior y navegación en línea inferior.
- En móvil, estado compacto junto a ObradORR: se muestra como punto y despliega texto al pulsar o cuando cambia el estado.
- Sin cambios en SQLite, fichas, ingredientes, APPCC, alérgenos, costes, impresión ni exportaciones.

- Cierre RC8: navegación final fijada como Inicio, Sesión actual, Sesiones guardadas, Elaboraciones, Ingredientes, Validación de obrador, Sistema.

## RC9-F · CSS print y maquetación A4

- Separada la hoja de estilos de impresión en `app/css/print-document.css`.
- `printDocumentShell()` deja de contener el bloque CSS largo incrustado.
- Se mantiene `print-view.html` como vista de impresión principal y el visor integrado como respaldo.
- Ajustes conservadores de A4, fotos, tablas, APPCC y saltos de página sin tocar datos gastronómicos.


## 2.1.0-RC9 · Print Final Cleanup

- Aplicada matriz de bloques imprimibles por modelo documental.
- Añadido escandallo técnico docente para modelos avanzados/completos.
- Añadida trazabilidad técnica para dossier completo.
- Ajustadas subelaboraciones culinarias y componentes panaderos por modelo.
- Base SQLite intacta.
