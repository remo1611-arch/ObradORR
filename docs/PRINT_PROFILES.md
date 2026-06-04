# Perfiles de salida documental · ObradORR 1.0.0-rc.21

## Principio general

ObradORR diferencia el dato técnico de su salida impresa. La base SQLite conserva formulaciones, subrecetas, alérgenos, APPCC y fuentes; el perfil documental decide qué densidad se muestra.

## Perfiles actuales

| Perfil | Destinatario | Uso | Costes por defecto | APPCC por defecto | Subrecetas |
|---|---|---|---:|---:|---|
| Aula-taller alumnado | Alumnado / práctica ordinaria | Documento operativo de aula | No | Sí, breve o desactivable | Sensibles desarrolladas, bases técnicas plegadas |
| Docente producción | Profesorado / preparación | Preparar práctica, mise en place y revisión de dependencias | Sí | Sí | Sensibles desarrolladas, bases técnicas plegadas |
| Auditoría documental | Departamento / revisión interna | Revisión técnica, fuentes, avisos B1-B4 y trazabilidad | Sí | Sí completo | Desarrollo amplio, sin simplificación pedagógica |
| Pedido consolidado | Compra / economato | Agrupar ingredientes expandidos | Según check | No aplica | Expansión de ingredientes, no fichas |

## Reglas de seguridad documental

Siempre deben permanecer visibles:

- Estado documental: pendiente, no apta o validada si algún día procede.
- Alérgenos directos y derivados consolidados.
- Avisos críticos de aceite como medio, bechamel/crema sensible, emulsión con huevo, pescado/fumet, sin gluten no certificado, prefermento/masa madre, laminado o rendimiento pendiente.
- Nota de que la ficha no sustituye el manual APPCC del centro.

## Subrecetas

- `SENSIBLE`: se desarrolla en la primera aparición cuando afecta a APPCC, alérgenos, coste o aprendizaje.
- `BASE_TECNICA`: se pliega fuera de auditoría para evitar saturación documental.
- Si una subreceta es ficha principal de la sesión, se trata como ficha principal aunque normalmente fuese base técnica.
- Si una subreceta ya se desarrolló en el mismo documento, las siguientes apariciones se referencian.

## Pendiente para 1.1

- Selector FPB/CM/GS más explícito.
- Clasificación editable de subrecetas por rol didáctico.
- Plantillas independientes de impresión.
- Campos específicos para laminado, fermentación, reducción, aceite como medio y validación de obrador.
