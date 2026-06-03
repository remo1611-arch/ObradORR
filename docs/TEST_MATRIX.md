# TEST_MATRIX · ObradORR 1.0.0-rc.3

| ID | Caso | Estado esperado | Validación |
|---|---|---|---|
| T-001 | `node --check` en JS | Sin errores | Automática |
| T-002 | SQLite integrity | `ok` | Automática |
| T-003 | SQLite FK | 0 errores | Automática |
| T-004 | `window.open` | 0 apariciones | Automática |
| T-005 | iframe impresión | presente | Automática |
| T-006 | `bakery_recipe_components` | > 0 | Automática |
| T-007 | `print_jobs` | tabla presente | Automática |
| T-008 | Torta de nata | nata y azúcar > 0 | Automática |
| T-009 | Windows local | abre app | Manual |
| T-010 | Android/Termux | abre app | Manual |
| T-011 | Fichas + pedido | genera documento | Manual |
| T-012 | Sesión guardada | guarda/carga/imprime | Manual |
| T-013 | Editar componente | guarda sin FK | Manual |
| T-014 | Editar prefermento | guarda sin FK | Manual |
| T-015 | Editar pasos técnicos | guarda/reordena | Manual |
