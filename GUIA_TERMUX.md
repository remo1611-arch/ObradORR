# Guía Termux · ObradORR 2.0.0

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_200_public_release_test
mkdir -p ~/obradorr_200_public_release_test

cp ~/storage/downloads/ObradORR_2_0_0_PUBLIC_RELEASE.zip ~/obradorr_200_public_release_test/
cp ~/storage/downloads/ObradORR_2_0_0_PUBLIC_RELEASE.zip.sha256 ~/obradorr_200_public_release_test/

cd ~/obradorr_200_public_release_test

sha256sum -c ObradORR_2_0_0_PUBLIC_RELEASE.zip.sha256
unzip -q ObradORR_2_0_0_PUBLIC_RELEASE.zip
cd ObradORR_2_0_0_PUBLIC_RELEASE

python tools/validate_release.py
python -m http.server 8835 --bind 127.0.0.1
```

Abrir:

```bash
termux-open-url "http://127.0.0.1:8835/app/obradorr.html?v=obradorr-200-public-release"
```

Reset local:

```bash
termux-open-url "http://127.0.0.1:8835/app/reset_local_data.html?v=obradorr-200-public-release-reset"
```
