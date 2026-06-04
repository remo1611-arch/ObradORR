# Guía Termux RC2

```bash
pkill -f "python -m http.server" 2>/dev/null || true
cd ~
rm -rf ~/obradorr_200_rc2_test
mkdir -p ~/obradorr_200_rc2_test
cp ~/storage/downloads/ObradORR_2_0_0_RC2_BACKUP_IMPORT_EXPORT.zip ~/obradorr_200_rc2_test/
cp ~/storage/downloads/ObradORR_2_0_0_RC2_BACKUP_IMPORT_EXPORT.zip.sha256 ~/obradorr_200_rc2_test/
cd ~/obradorr_200_rc2_test
sha256sum -c ObradORR_2_0_0_RC2_BACKUP_IMPORT_EXPORT.zip.sha256
unzip -q ObradORR_2_0_0_RC2_BACKUP_IMPORT_EXPORT.zip
cd ObradORR_2_0_0_RC2_BACKUP_IMPORT_EXPORT
python tools/validate_release.py
python -m http.server 8824 --bind 127.0.0.1
```

Abrir:

```bash
termux-open-url "http://127.0.0.1:8824/app/obradorr.html?v=obradorr-200-rc2-backup-import-export"
```

Reset:

```bash
termux-open-url "http://127.0.0.1:8824/app/reset_local_data.html?v=obradorr-200-rc2-backup-import-export-reset"
```
