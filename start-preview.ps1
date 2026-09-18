$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$localNode = Join-Path $PSScriptRoot '.tools/node-v22.16.0-win-x64'
if (Test-Path -LiteralPath (Join-Path $localNode 'node.exe')) { $env:PATH = "$localNode;$env:PATH" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instale o Node.js 22 LTS e execute este arquivo novamente.' }
if (-not (Test-Path -LiteralPath 'node_modules')) { & npm.cmd ci }
& npm.cmd run dev -- --port 5173 --strictPort
