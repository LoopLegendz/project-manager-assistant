# Lance l'application sur http://127.0.0.1:8000
# Arrête uniquement les processus qui écoutent sur les ports de l'app (8000-8004).
# Usage : .\start.ps1   (depuis le dossier assistant-cdp, dans PowerShell)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

function Stop-PortListener([int]$port) {
    $pids = netstat -ano |
        Select-String ":$port " |
        Select-String "LISTENING" |
        ForEach-Object { ($_ -split '\s+')[-1] } |
        Where-Object { $_ -match '^\d+$' } |
        Select-Object -Unique
    foreach ($procId in $pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

foreach ($p in 8000, 8001, 8002, 8003, 8004) { Stop-PortListener $p }
Start-Sleep -Seconds 2
# second passage au cas où
foreach ($p in 8000, 8001, 8002, 8003, 8004) { Stop-PortListener $p }

# attend que le port 8000 soit libre (max 10 s)
$libre = $false
for ($i = 0; $i -lt 10; $i++) {
    $occ = netstat -ano | Select-String ":8000 " | Select-String "LISTENING"
    if (-not $occ) { $libre = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $libre) {
    Write-Warning "Le port 8000 est encore occupé après nettoyage. Identifiez le processus : netstat -ano | Select-String ':8000 '"
    exit 1
}

Write-Host "Lancement sur http://127.0.0.1:8000 ..."
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
