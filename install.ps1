# Windows (PowerShell): .\install.ps1 [coff install flags]   e.g. .\install.ps1 --opencode --profile free
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error "Node.js >= 18 nao encontrado. Baixe em https://nodejs.org"; exit 1 }
node "$PSScriptRoot\scripts\install.mjs" @args
exit $LASTEXITCODE
