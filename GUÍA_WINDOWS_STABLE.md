# Guía Windows · ObradORR 2.0.0 STABLE

1. Descomprimir `ObradORR_2_0_0_STABLE.zip`.
2. Abrir PowerShell en la carpeta descomprimida.
3. Ejecutar:

```powershell
python tools/validate_release.py
python -m http.server 8830 --bind 127.0.0.1
```

4. Abrir:

```text
http://127.0.0.1:8830/app/obradorr.html?v=obradorr-200-stable
```

Para limpiar recuperación local:

```text
http://127.0.0.1:8830/app/reset_local_data.html?v=obradorr-200-stable-reset
```
