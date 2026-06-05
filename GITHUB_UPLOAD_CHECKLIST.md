# Checklist de subida a GitHub · ObradORR 2.0.0

Antes de publicar:

1. Ejecutar:
   ```bash
   python tools/validate_release.py
   ```
2. Confirmar que el resultado es `OK`.
3. Confirmar que no se suben carpetas temporales de prueba.
4. Confirmar que no se suben ZIP antiguos, PDFs de prueba ni capturas personales.
5. Revisar `LICENSE.md`, `NOTICE.md` y `AVISO_LEGAL.md`.
6. Abrir localmente:
   ```text
   app/obradorr.html?v=obradorr-200-public-release-final-ui-hints
   ```
7. Generar un PDF breve de prueba.
8. Descargar una copia SQLite desde Sistema.
9. Subir el contenido de esta carpeta como raíz del repositorio.

No cambiar el `cache_tag` de esta release una vez publicada.
