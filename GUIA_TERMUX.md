# Guía Termux · ObradORR 2.1.0-RC8 Release Candidate

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_210_rc8_release_candidate_test
mkdir -p ~/obradorr_210_rc8_release_candidate_test

cp ~/storage/downloads/ObradORR_2_1_0_RC8_RELEASE_CANDIDATE.zip ~/obradorr_210_rc8_release_candidate_test/
cp ~/storage/downloads/ObradORR_2_1_0_RC8_RELEASE_CANDIDATE.zip.sha256 ~/obradorr_210_rc8_release_candidate_test/

cd ~/obradorr_210_rc8_release_candidate_test
sha256sum -c ObradORR_2_1_0_RC8_RELEASE_CANDIDATE.zip.sha256

unzip -q ObradORR_2_1_0_RC8_RELEASE_CANDIDATE.zip
cd ObradORR_2_1_0_RC8_RELEASE_CANDIDATE

python tools/validate_release.py
python -m http.server 8861 --bind 127.0.0.1
```

Reset local recomendado si vienes de pruebas anteriores:

```bash
STAMP=$(date +%Y%m%d%H%M%S)
termux-open-url "http://127.0.0.1:8861/app/reset_local_data.html?v=obradorr-210-rc8-release-candidate-reset-$STAMP"
```

Abrir:

```bash
STAMP=$(date +%Y%m%d%H%M%S)
termux-open-url "http://127.0.0.1:8861/app/obradorr.html?v=obradorr-210-rc8-release-candidate-$STAMP"
```
