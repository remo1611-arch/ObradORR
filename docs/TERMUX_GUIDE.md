# TERMUX_GUIDE · ObradORR 1.0.0-rc.9

## Proba local

```bash
cd ~
find ~/storage/downloads ~/downloads ~/Download /sdcard/Download -maxdepth 1 -type f -name "ObradORR_1_0_0_RC9.zip" 2>/dev/null
rm -rf ~/obradorr_rc9_test
mkdir -p ~/obradorr_rc9_test
cp ~/storage/downloads/ObradORR_1_0_0_RC9.zip ~/obradorr_rc9_test/
cd ~/obradorr_rc9_test
sha256sum ObradORR_1_0_0_RC9.zip
unzip -q ObradORR_1_0_0_RC9.zip
cd ObradORR_1_0_0_RC9
python tools/validate_release.py .
pkill -f "python -m http.server" 2>/dev/null || true
python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc9
```

Reset local:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc9
```
