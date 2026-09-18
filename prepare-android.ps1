$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeDir = Join-Path $PSScriptRoot '.tools/node-v22.16.0-win-x64'
if (Test-Path -LiteralPath "$nodeDir/node.exe") { $env:PATH = "$nodeDir;$env:PATH" }
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$jdkCandidates = @('C:/Program Files/Java/jdk-21.0.11', (Join-Path $env:USERPROFILE '.jdks/jbr-21.0.11'))
$selectedJdk = $jdkCandidates | Where-Object { Test-Path -LiteralPath "$_/bin/java.exe" } | Select-Object -First 1
if (-not $selectedJdk) { throw 'JDK 21 não encontrado. Configure JAVA_HOME para um JDK 21.' }
$env:JAVA_HOME = $selectedJdk
$env:DEBUG = ''
if (-not (Test-Path -LiteralPath "$env:ANDROID_HOME/platform-tools/adb.exe")) { throw 'SDK Android não encontrado. Conclua o assistente do Android Studio.' }
$sdkLine = 'sdk.dir=' + $env:ANDROID_HOME.Replace('\','/')
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'android/local.properties'), $sdkLine)
& npm.cmd run android:sync
if ($LASTEXITCODE -ne 0) { throw 'Falha ao sincronizar o app.' }
& ./android/gradlew.bat -p android assembleDebug --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar o APK. Veja a mensagem do Gradle acima.' }
Write-Host 'APK: android/app/build/outputs/apk/debug/app-debug.apk'
& "$env:ANDROID_HOME/platform-tools/adb.exe" devices -l
