# WINDOWS_GUIDE · ObradORR 1.0.0-rc.1

PowerShell desde la carpeta donde esté el ZIP:

```powershell
$zip = "$env:USERPROFILE\Downloads\ObradORR_1_0_0_RC1.zip"
$dest = "$env:USERPROFILE\Desktop\ObradORR_RC1_TEST"

Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dest | Out-Null
Copy-Item $zip $dest
Set-Location $dest

Get-FileHash .\ObradORR_1_0_0_RC1.zip -Algorithm SHA256
Expand-Archive .\ObradORR_1_0_0_RC1.zip -DestinationPath . -Force
Set-Location .\ObradORR_1_0_0_RC1

python .\tools\validate_release.py
python -m http.server 8807 --bind 127.0.0.1
```

Abrir en navegador:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc1
```
