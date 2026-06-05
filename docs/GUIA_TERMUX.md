# Guía Termux · ObradORR 2.1.0-RC7

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_210_rc4_hardening_test
mkdir -p ~/obradorr_210_rc4_hardening_test

cp ~/storage/downloads/ObradORR_2_1_0_RC5_HARDENING_BASES.zip ~/obradorr_210_rc4_hardening_test/
cp ~/storage/downloads/ObradORR_2_1_0_RC5_HARDENING_BASES.zip.sha256 ~/obradorr_210_rc4_hardening_test/

cd ~/obradorr_210_rc4_hardening_test

sha256sum -c ObradORR_2_1_0_RC5_HARDENING_BASES.zip.sha256
unzip -q ObradORR_2_1_0_RC5_HARDENING_BASES.zip
cd ObradORR_2_1_0_RC5_HARDENING_BASES

python tools/validate_release.py
python -m http.server 8847 --bind 127.0.0.1
```

Primero reset local:

```bash
termux-open-url "http://127.0.0.1:8847/app/reset_local_data.html?v=obradorr-210-rc7-release-candidate-reset-$(date +%Y%m%d%H%M%S)"
```

Después abrir la app:

```bash
termux-open-url "http://127.0.0.1:8847/app/obradorr.html?v=obradorr-210-rc7-release-candidate-$(date +%Y%m%d%H%M%S)"
```
