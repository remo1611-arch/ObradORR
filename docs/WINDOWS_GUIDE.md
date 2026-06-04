# WINDOWS_GUIDE · ObradORR 1.0.0-rc.20

## Arranque local

Descomprime el ZIP. Abre PowerShell en la raíz del proyecto y ejecuta:

```powershell
python -m http.server 8807 --bind 127.0.0.1
```

Abrir en navegador:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc20
```

Si venías de una versión anterior:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc20
```
