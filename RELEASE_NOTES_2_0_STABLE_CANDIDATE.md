# ObradORR 2.0.0 STABLE-CANDIDATE

Fecha de cierre: 2026-06-04T20:44:00Z

## Veredicto

Esta versión se declara **candidata estable** tras RC3.1. El cierre es documental y de empaquetado: no modifica fórmulas, rendimientos, alérgenos, APPCC, backup/importación, motor recursivo ni motor de impresión.

## Base técnica

Parte de `ObradORR_2_0_0_RC3_1_HOTFIX_MAQUETACION`.

Incluye como base funcional:

- motor recursivo para pedido, costes y alérgenos derivados;
- perfiles documentales diferenciados;
- preflight documental por perfil;
- editor cómodo y editor seguro;
- exportaciones CSV/TSV/JSON/ZIP;
- backup SQLite/JSON/ZIP con fallback;
- importación combinada segura entre bases compatibles;
- nombre de documentos con fecha ISO y segundos;
- fecha visible en formato español con coma;
- foto de cabecera alineada a la derecha;
- APPCC breve compacto;
- cierre de maquetación RC3.1.

## Límites

- No valida recetas en obrador.
- No declara rendimientos reales, mermas, pesos cocidos ni aceptación organoléptica.
- La importación combinada se considera apta para bases ObradORR compatibles, no para bases antiguas SwiftRemo/ObradORR sin adaptador.
- La impresión PDF depende del motor de impresión del navegador.

## Estado recomendado

Uso docente controlado como candidata estable. Antes de declararla versión estable definitiva conviene probar en entorno real: navegador, PDF, exportaciones, backup, importación combinada y edición.
