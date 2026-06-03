# TERMUX_GUIDE · ObradORR 1.0.0-rc.1

El entorno Termux del usuario ya tiene Python, Node, unzip, coreutils y almacenamiento configurado.

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_rc1_test
mkdir -p ~/obradorr_rc1_test

cp ~/storage/downloads/ObradORR_1_0_0_RC1.zip ~/obradorr_rc1_test/
cd ~/obradorr_rc1_test

sha256sum ObradORR_1_0_0_RC1.zip
unzip -q ObradORR_1_0_0_RC1.zip
cd ObradORR_1_0_0_RC1

python tools/validate_release.py
python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc1
```

Reinicio local:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc1
```
