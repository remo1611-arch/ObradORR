# Guía Windows RC2

1. Descomprimir el ZIP.
2. Abrir PowerShell en la carpeta raíz.
3. Ejecutar:

```powershell
python tools/validate_release.py
python -m http.server 8824 --bind 127.0.0.1
```

4. Abrir en el navegador:

`http://127.0.0.1:8824/app/obradorr.html?v=obradorr-200-rc2-backup-import-export`
