# Guía Windows · ObradORR 2.1.0-RC7

1. Descomprime `ObradORR_2_1_0_RC5_HARDENING_BASES.zip`.
2. Abre PowerShell o Terminal en la carpeta descomprimida.
3. Ejecuta:

```powershell
python -m http.server 8847 --bind 127.0.0.1
```

4. Abre primero el reset local:

```text
http://127.0.0.1:8847/app/reset_local_data.html?v=obradorr-210-rc7-release-candidate-reset
```

5. Después abre la aplicación:

```text
http://127.0.0.1:8847/app/obradorr.html?v=obradorr-210-rc7-release-candidate
```
