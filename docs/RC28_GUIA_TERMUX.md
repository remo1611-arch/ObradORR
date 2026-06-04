# RC28 · Guía Termux

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_rc28_test
mkdir -p ~/obradorr_rc28_test

cp ~/storage/downloads/ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip ~/obradorr_rc28_test/
cp ~/storage/downloads/ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip.sha256 ~/obradorr_rc28_test/

cd ~/obradorr_rc28_test

sha256sum -c ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip.sha256

unzip -q ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip

cd ObradORR_1_0_0_RC28_STABLE_CANDIDATE

python tools/validate_release.py

python -m http.server 8819 --bind 127.0.0.1
```

Abrir:

```bash
termux-open-url "http://127.0.0.1:8819/app/obradorr.html?v=obradorr-100-rc28-stable-candidate"
```

Si el navegador conserva datos de una versión previa, abrir primero:

```bash
termux-open-url "http://127.0.0.1:8819/app/reset_local_data.html?v=obradorr-100-rc28-stable-candidate-reset"
```
