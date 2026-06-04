# RC28 · Guía Windows / PowerShell

```powershell
$zip = "$HOME\Downloads\ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip"
$sha = "$HOME\Downloads\ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip.sha256"
$work = "$HOME\obradorr_rc28_test"
$folder = "$work\ObradORR_1_0_0_RC28_STABLE_CANDIDATE"

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $work | Out-Null

Copy-Item $zip $work
Copy-Item $sha $work

cd $work

Get-FileHash .\ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip -Algorithm SHA256
Get-Content .\ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip.sha256

Expand-Archive .\ObradORR_1_0_0_RC28_STABLE_CANDIDATE.zip -DestinationPath .

cd $folder

python toolsalidate_release.py

python -m http.server 8819 --bind 127.0.0.1
```

Abrir en navegador:

```text
http://127.0.0.1:8819/app/obradorr.html?v=obradorr-100-rc28-stable-candidate
```

Reset local si procede:

```text
http://127.0.0.1:8819/app/reset_local_data.html?v=obradorr-100-rc28-stable-candidate-reset
```
