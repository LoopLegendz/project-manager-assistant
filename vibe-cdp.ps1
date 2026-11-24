# Lance Vibe avec la configuration de l'application (vibe_home), puis restaure l'environnement.
$ancien = $env:VIBE_HOME
$env:VIBE_HOME = Join-Path $PSScriptRoot "vibe_home"
try { vibe @args } finally { $env:VIBE_HOME = $ancien }