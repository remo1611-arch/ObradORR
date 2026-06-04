# RC13 · Vía B · Auditoría documental por fuentes

Aplicado sobre ObradORR 1.0.0-rc.11 para generar ObradORR 1.0.0-rc.13.

## Decisión

Se adopta una política de trabajo más honesta y defendible:

- Las fichas son **propuestas técnicas documentales**.
- Las fuentes bibliográficas, normativas y profesionales permiten contrastar formulación, técnica, alérgenos y APPCC.
- Ninguna ficha se marca como `validada` por el hecho de estar contrastada documentalmente.
- `validada` queda reservado a prueba real de obrador/aula-taller con rendimiento, proceso, resultado y observaciones documentadas.

## Cambios aplicados

1. Se actualiza la versión a `1.0.0-rc.13`.
2. Se crea la tabla `documentary_sources`.
3. Se crea la tabla `recipe_documentary_reviews`.
4. Se incorporan fuentes marco iniciales.
5. Se añade metadato `source_audit_policy` en `app_meta`.
6. Se refuerza la impresión con aviso `Vía B · Fuentes`.
7. Se conserva `validada = 0` en recetas culinarias y panaderas.

## Qué no se ha hecho

- No se ha cambiado ninguna ficha de `pendiente` a `validada`.
- No se han inventado pesos cocidos, mermas, tiempos, temperaturas ni rendimientos.
- No se ha cerrado ningún alérgeno dependiente de ficha técnica de proveedor.
- No se ha dado por certificada ninguna ficha sin gluten.
- No se ha sustituido el APPCC del centro.

## Criterio de uso

La revisión documental debe registrar, por ficha o familia:

- fuente principal;
- fuente secundaria;
- criterio técnico aplicado;
- desviación respecto a fuente;
- nivel de confianza;
- motivo por el que sigue pendiente de prueba de obrador.
