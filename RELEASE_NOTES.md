# Release notes · ObradORR 2.1.0-RC9 · Release Candidate

Versión candidata centrada en el cierre del sistema de impresión documental.

## Cambios principales

- Nueva arquitectura de impresión basada en modelo documental, matriz de bloques y secciones imprimibles.
- Vista oficial de impresión independiente: `app/print-view.html`.
- CSS de impresión separado en `app/css/print-document.css`.
- Modelos documentales neutrales:
  - Ficha de trabajo.
  - Ficha técnica.
  - Ficha técnica ampliada.
  - Dossier completo de producción.
- `Pedido` pasa a llamarse **Pedido de producción**.
- Ficha técnica ampliada con costes por línea y coste total estimado.
- Dossier completo sin duplicidad económica: el coste se concentra en el bloque **Escandallo técnico docente**.
- Resolvedor común de alérgenos por ficha y pedido, incluyendo cocina, panadería/pastelería, subelaboraciones y componentes.
- Control de subelaboraciones según modelo: referencia, desglose o subfichas.
- Panadería/pastelería mantiene bloques técnicos: prefermento, masa final, relleno, cobertura, decoración/acabado y proceso.
- APPCC por modelo: breve o completo según finalidad documental.
- Retirado de la interfaz el visor integrado clásico para evitar rutas documentales duplicadas.
- Si el navegador bloquea la pestaña de impresión, se ofrece apertura manual de `print-view.html`.

## Sin cambios gastronómicos

No se modifica la base `db/obradorr.sqlite`, recetas, ingredientes, APPCC, alérgenos ni costes almacenados.

## Validación

La validación interna comprueba:

- integridad SQLite;
- claves foráneas;
- exportaciones;
- retirada de importación Excel como vía de edición;
- modelos de impresión neutrales;
- `print-view.html`;
- CSS de impresión externo;
- resolvedor común de alérgenos;
- ausencia de fallback visible al visor integrado clásico;
- coherencia de costes entre ficha ampliada y dossier completo.

## Recomendación de publicación

Subir como tag `v2.1.0-rc9`. Tras prueba real en PC y móvil, valorar promoción a `v2.1.0` pública estable.
