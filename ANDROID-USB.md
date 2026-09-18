# Preparação e instalação por USB

Ambiente identificado em 17/09/2026:

- Android Studio: `C:/Program Files/Android/Android Studio`.
- SDK: `C:/Users/Igor/AppData/Local/Android/Sdk`.
- Java para compilação: JDK 21 em `C:/Program Files/Java/jdk-21.0.11`. O Studio também baixou JBR 21 em `.jdks`.
- O JBR 25 incluído no Studio não é compatível com o Gradle 8.11.1 deste projeto. Em Settings → Build, Execution, Deployment → Build Tools → Gradle, use JDK 21.
- SDK Platform 35 e Build Tools 34.0.0 são instalados pelo Gradle usando as licenças já aceitas no assistente. Platform Tools/ADB já está disponível.
- `android/local.properties` aponta para o SDK. `android.overridePathCheck=true` permite tentar a compilação na pasta atual, que contém acento.
- `kotlin.compiler.execution.strategy=in-process` corrige o erro de caminho Unicode no compilador Kotlin. Com esses ajustes, `assembleDebug` terminou com **BUILD SUCCESSFUL** e gerou o APK. O sucesso foi confirmado em 18/09/2026; a instalação ainda depende de um celular USB detectado e autorizado.

Para preparar futuras versões, execute no terminal desta pasta:

```powershell
powershell -ExecutionPolicy Bypass -File .\prepare-android.ps1
```

Para conectar o celular:

1. Abra Configurações → Sobre o telefone. Toque sete vezes em Número da versão/Compilação (em alguns Samsung, fica em Informações do software). Informe o PIN se solicitado.
2. Volte às Configurações → Opções do desenvolvedor e ative Depuração USB.
3. Conecte um cabo USB que transmita dados, mantenha a tela desbloqueada e aceite a autorização de depuração para este computador. Se necessário, selecione Transferência de arquivos na opção USB.
4. Execute o script abaixo. Ele instala o APK de teste gerado e abre o app, sem desinstalar versões anteriores:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-android.ps1
```

Se a listagem do ADB ficar vazia, tente outro cabo/porta USB. Se aparecer `unauthorized`, aceite a janela no celular. Se o Windows exigir driver, instale o driver oficial do fabricante. Não é necessário desativar proteções do Windows.

O APK é `android/app/build/outputs/apk/debug/app-debug.apk`. A instalação automática precisa de apenas um celular USB conectado. Se já existir uma versão assinada com outra chave, o script interrompe; não remove o aplicativo nem seus dados.

No Android Studio, o equivalente é selecionar o aparelho e clicar em Run. Se o Studio mostrar um erro antigo de sincronização após mudanças em Gradle, use File → Sync Project with Gradle Files.

Referência: [instalação em aparelho físico e configuração USB](https://developer.android.com/studio/run/device).
