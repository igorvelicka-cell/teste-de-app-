$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$adbPath = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
$apkPath = Join-Path $PSScriptRoot 'android/app/build/outputs/apk/debug/app-debug.apk'
if (-not (Test-Path -LiteralPath $apkPath)) { throw 'Primeiro execute prepare-android.ps1 para gerar o APK.' }
if (-not (Test-Path -LiteralPath $adbPath)) { throw 'ADB não encontrado no SDK Android.' }
& $adbPath devices -l
& $adbPath -d get-state
if ($LASTEXITCODE -ne 0) { throw 'Conecte somente um celular por USB, ative Depuração USB e aceite a autorização no aparelho.' }
& $adbPath -d install -r $apkPath
if ($LASTEXITCODE -ne 0) { throw 'A instalação não foi concluída. Veja o erro do ADB acima. Nenhum aplicativo foi desinstalado.' }
& $adbPath -d shell am start -n 'br.com.contasemdia.app/.MainActivity'
if ($LASTEXITCODE -ne 0) { throw 'APK instalado, mas não foi possível abrir automaticamente.' }
Write-Host 'Contas em Dia instalado e aberto no celular.'
