# TERMUX_GUIDE · ObradORR 1.0.0-rc.3

## Proba local

```bash
cd ~
find ~/storage/downloads ~/downloads ~/Download /sdcard/Download -maxdepth 1 -type f -name "ObradORR_1_0_0_RC3.zip" 2>/dev/null
rm -rf ~/obradorr_rc2_test
mkdir -p ~/obradorr_rc2_test
cp ~/storage/downloads/ObradORR_1_0_0_RC3.zip ~/obradorr_rc2_test/
cd ~/obradorr_rc2_test
sha256sum ObradORR_1_0_0_RC3.zip
unzip -q ObradORR_1_0_0_RC3.zip
cd ObradORR_1_0_0_RC3
python tools/validate_release.py .
pkill -f "python -m http.server" 2>/dev/null || true
python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc3
```

Reset local:

```text
http://127.0.0.1:8807/app/reset_local_data.html?v=obradorr-100-rc3
```
