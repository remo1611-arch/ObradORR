# Guía Windows · ObradORR 2.0.0 STABLE-CANDIDATE · Persistence hotfix

1. Descomprimir `ObradORR_2_0_0_STABLE_CANDIDATE.zip`.
2. Abrir una terminal en la carpeta descomprimida.
3. Ejecutar:

```powershell
python tools/validate_release.py
python -m http.server 8827 --bind 127.0.0.1
```

4. Abrir en el navegador:

```text
http://127.0.0.1:8827/app/obradorr.html?v=obradorr-200-stable-candidate-persistence-hotfix
```

Reset local:

```text
http://127.0.0.1:8827/app/reset_local_data.html?v=obradorr-200-stable-candidate-persistence-hotfix-reset
```
