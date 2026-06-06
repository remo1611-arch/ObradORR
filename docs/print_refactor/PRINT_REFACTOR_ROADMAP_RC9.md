# ObradORR 2.1.0-RC9 · Hoja de ruta de refactorización de impresión

## Principio rector

La impresión se refactoriza por fases. No se toca el catálogo ni se reescribe la aplicación completa. Cada fase debe poder validarse y compararse con RC8.

## Resultado final buscado

Un sistema de impresión basado en:

```text
datos SQLite + sesión actual
↓
modelo documental neutral
↓
resolución de opciones
↓
secciones imprimibles
↓
print-view.html independiente
↓
PDF desde navegador
```

## Modelos finales de ficha

1. **Ficha de trabajo**  
   Ingredientes, cantidades, foto si existe y proceso. Documento limpio para ejecución.

2. **Ficha técnica**  
   Ingredientes, proceso, alérgenos, conservación/servicio y APPCC breve o intermedio.

3. **Ficha técnica ampliada**  
   Proceso técnico, APPCC docente, subelaboraciones desarrolladas, incidencias, conservación y servicio.

4. **Dossier completo de producción**  
   Documento interno completo con costes, escandallo, subelaboraciones, APPCC completo, validación documental y trazabilidad.

5. **Pedido de producción**  
   Documento consolidado de ingredientes para la sesión actual. Sustituye el nombre visible `Pedido`.

## Fases

### RC9-A · Auditoría y mapa de impresión

Estado: completada en este paquete.

Entrega:

- `docs/print_refactor/PRINT_AUDIT_RC9_A.md`
- `docs/print_refactor/PRINT_REFACTOR_ROADMAP_RC9.md`

Sin cambios funcionales.

### RC9-B · Modelos neutrales y resolución de opciones

Crear capa de configuración sin cambiar profundamente el renderer.

Entrega prevista:

- `app/js/print/print-models.js`
- `app/js/print/print-options-resolver.js`
- UI con modelos neutrales
- `Pedido` renombrado a `Pedido de producción`
- validación ampliada

### RC9-C · Documento independiente de impresión

Introducir `app/print-view.html` y una vía de impresión independiente.

Entrega prevista:

- `app/print-view.html`
- traspaso seguro del documento desde la app principal
- fallback al visor anterior si procede

### RC9-E · Secciones imprimibles

Extraer secciones a módulos:

- cabecera documental
- datos docentes
- ficha culinaria
- ficha panadera
- ingredientes
- proceso
- APPCC
- alérgenos
- costes/escandallo
- pedido de producción
- validación documental

### RC9-E · Subelaboraciones y panadería

Normalizar subelaboraciones culinarias y componentes panaderos:

- `none`
- `ingredients`
- `sheets`
- componentes obligatorios/opcionales/variantes
- prefermento/masa final/acabados

### RC9-F · CSS print limpio

Separar CSS de impresión del JS:

- `app/css/print-base.css`
- `app/css/print-layout.css`
- `app/css/print-tables.css`

### RC9 · Regresión documental

Crear pruebas de humo de impresión:

- ficha simple
- ficha con foto
- ficha con subreceta
- panadería con prefermento
- ficha + pedido de producción
- dossier con costes

### RC9 · Release Candidate

Cierre de RC9 con:

- `validate_release.py` ampliado
- logs
- hash SQLite intacto
- notas de versión

## Límites

No se hará en RC9 salvo decisión explícita:

- DOCX
- cambios de catálogo
- cambios gastronómicos
- nuevas recetas
- edición masiva
- importación Excel
