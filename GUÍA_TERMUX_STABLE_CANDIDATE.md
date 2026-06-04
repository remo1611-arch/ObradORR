# Guía Termux · ObradORR 2.0.0 STABLE-CANDIDATE

```bash
pkill -f "python -m http.server" 2>/dev/null || true

cd ~
rm -rf ~/obradorr_200_stable_candidate_test
mkdir -p ~/obradorr_200_stable_candidate_test

cp ~/storage/downloads/ObradORR_2_0_0_STABLE_CANDIDATE.zip ~/obradorr_200_stable_candidate_test/
cp ~/storage/downloads/ObradORR_2_0_0_STABLE_CANDIDATE.zip.sha256 ~/obradorr_200_stable_candidate_test/

cd ~/obradorr_200_stable_candidate_test

sha256sum -c ObradORR_2_0_0_STABLE_CANDIDATE.zip.sha256

unzip -q ObradORR_2_0_0_STABLE_CANDIDATE.zip

cd ObradORR_2_0_0_STABLE_CANDIDATE

python tools/validate_release.py

python -m http.server 8827 --bind 127.0.0.1
```

Abrir:

```bash
termux-open-url "http://127.0.0.1:8827/app/obradorr.html?v=obradorr-200-stable-candidate"
```

Reset local:

```bash
termux-open-url "http://127.0.0.1:8827/app/reset_local_data.html?v=obradorr-200-stable-candidate-reset"
```
