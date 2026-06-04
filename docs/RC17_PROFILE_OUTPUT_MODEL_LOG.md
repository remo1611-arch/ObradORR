# RC18 · Modelo de salida por perfiles

## Decisión técnica

Se implementa una capa de renderizado documental por perfiles, sin modificar el modelo de datos SQLite salvo metadatos de versión.

## Perfiles

- `aula_taller`: salida compacta por defecto para alumnado y práctica ordinaria.
- `docente_produccion`: salida para preparación docente, con más coste, pedido y subrecetas sensibles.
- `auditoria_completa`: salida completa para revisión interna.

## Reglas de subrecetas

- Deduplicación por identidad de ficha, no por nombre.
- Primera aparición: se desarrolla o pliega según perfil y categoría.
- Apariciones posteriores: referencia breve.
- Bases técnicas: plegadas salvo que sean ficha principal.
- Subrecetas sensibles: desarrolladas en primera aparición.
- Defecto: tratado con prudencia como sensible en perfiles no auditoría.

## Seguridad documental mantenida

- Estado documental siempre visible.
- Alérgenos directos y derivados consolidados.
- Avisos críticos conservados.
- APPCC docente mínimo en salida de aula.
- Auditoría completa disponible como perfil especializado.
