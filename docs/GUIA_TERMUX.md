# Guía Termux

```bash
pkill -f "python -m http.server" 2>/dev/null || true
cd ~
rm -rf ~/obradorr_200_public_test
mkdir -p ~/obradorr_200_public_test
cp ~/storage/downloads/ObradORR_2_0_0_PUBLIC_GITHUB_READY.zip ~/obradorr_200_public_test/
cp ~/storage/downloads/ObradORR_2_0_0_PUBLIC_GITHUB_READY.zip.sha256 ~/obradorr_200_public_test/
cd ~/obradorr_200_public_test
sha256sum -c ObradORR_2_0_0_PUBLIC_GITHUB_READY.zip.sha256
unzip -q ObradORR_2_0_0_PUBLIC_GITHUB_READY.zip
cd ObradORR_2_0_0_PUBLIC_GITHUB_READY
python tools/validate_release.py
python -m http.server 8832 --bind 127.0.0.1
```

Abrir:

```bash
termux-open-url "http://127.0.0.1:8832/app/obradorr.html?v=obradorr-200-public-github-ready"
```

Reset local:

```bash
termux-open-url "http://127.0.0.1:8832/app/reset_local_data.html?v=obradorr-200-public-github-ready-reset"
```

En móvil/Termux, descarga una copia SQLite al terminar sesiones importantes.
