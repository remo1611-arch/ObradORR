# Guía Termux · ObradORR 2.1.0-RC9

Comandos para probar la versión en Android con Termux.

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_210_rc9_test
mkdir -p ~/obradorr_210_rc9_test

cp ~/storage/downloads/ObradORR_2_1_0_RC9_RELEASE_CANDIDATE.zip ~/obradorr_210_rc9_test/
cp ~/storage/downloads/ObradORR_2_1_0_RC9_RELEASE_CANDIDATE.zip.sha256 ~/obradorr_210_rc9_test/

cd ~/obradorr_210_rc9_test
sha256sum -c ObradORR_2_1_0_RC9_RELEASE_CANDIDATE.zip.sha256

unzip -q ObradORR_2_1_0_RC9_RELEASE_CANDIDATE.zip
cd ObradORR_2_1_0_RC9_RELEASE_CANDIDATE

python tools/validate_release.py
python -m http.server 8870 --bind 127.0.0.1
```

En otra sesión:

```bash
STAMP=$(date +%Y%m%d%H%M%S)
termux-open-url "http://127.0.0.1:8870/app/reset_local_data.html?v=obradorr-210-rc9-release-candidate-reset-$STAMP"
```

Después:

```bash
STAMP=$(date +%Y%m%d%H%M%S)
termux-open-url "http://127.0.0.1:8870/app/obradorr.html?v=obradorr-210-rc9-release-candidate-$STAMP"
```
