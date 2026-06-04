# WINDOWS_GUIDE · ObradORR 1.0.0-rc.9

## Proba local en PowerShell

```powershell
$ZipName = "ObradORR_1_0_0_RC9.zip"
$ZipPath = Join-Path $env:USERPROFILE "Downloads\$ZipName"
$TestDir = Join-Path $env:USERPROFILE "Desktop\ObradORR_RC9_TEST"
Remove-Item $TestDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $TestDir | Out-Null
Copy-Item $ZipPath $TestDir
Set-Location $TestDir
Get-FileHash $ZipName -Algorithm SHA256
Expand-Archive -Path $ZipName -DestinationPath $TestDir -Force
Set-Location "$TestDir\ObradORR_1_0_0_RC9"
python tools\validate_release.py .
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
python -m http.server 8807 --bind 127.0.0.1
```

Abrir:

```text
http://127.0.0.1:8807/app/obradorr.html?v=obradorr-100-rc9
```
