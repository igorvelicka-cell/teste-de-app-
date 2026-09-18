# Contas em Dia

Aplicativo pessoal em português, React + TypeScript + Capacitor 7. Sem conta de usuário, API, banco de dados ou serviço de nuvem.

## Abrir a prévia

Endereço: **http://127.0.0.1:5173/**. O servidor de desenvolvimento foi deixado em execução.

Para iniciar novamente no PowerShell, dentro desta pasta:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-preview.ps1
```

O script usa o Node.js 22 preparado em `.tools`, sem alterar o PATH permanente do Windows. Em outra máquina, instale Node.js 22 LTS e execute `npm ci` e `npm run dev`. Não abra o `index.html` diretamente nem use o Live Server para servir os fontes TypeScript.

No VS Code: abra esta pasta; pressione **Ctrl+Shift+P** e procure **Browser: Open Integrated Browser**, se disponível, ou **Simple Browser: Show**. Informe `http://127.0.0.1:5173/`. Se nenhum comando aparecer, use o navegador externo. Há também a tarefa **Contas em Dia: iniciar prévia**, em Terminal → Executar Tarefa. Não inicie outro servidor se a porta já estiver ocupada pela prévia atual. Consulte a [documentação do navegador integrado](https://code.visualstudio.com/docs/debugtest/integrated-browser).

No navegador, F12 → alternar barra de dispositivos (Ctrl+Shift+M no Chrome/Edge) permite testar a largura de celular. A prévia incorporada e o navegador externo podem ter áreas de armazenamento distintas. Use sempre o mesmo endereço e perfil para reencontrar seus dados.

## Uso

- Comece com **Novo imóvel** e depois **Nova conta**. Categorias aceitam texto personalizado.
- Mensais geram cobranças sem valor e foto; parcelas usam o valor informado em cada parcela e respeitam o limite; conta única não repete.
- Toque no nome da cobrança para corrigir valor, vencimento, nome, categoria e fotos. Correções são individuais; não reescrevem o histórico ou o dia das próximas cobranças.
- **Pagar** pede valor e data, com comprovante independente da foto da conta. Em detalhes é possível corrigir a data ou desfazer o pagamento.
- **Encerrar recorrência** impede novas cobranças mensais sem apagar as já existentes. Exclusões pedem confirmação; uma cobrança excluída não reaparece por geração automática.
- As setas e o seletor de mês permitem consultar competências. Atrasadas inclui meses anteriores. No Histórico, os totais por imóvel usam a **data real do pagamento**; a lista de cobranças usa a competência.
- Em **Ajustes → Entrar na demonstração**, os dados fictícios ficam apenas em memória. Alterações nesse modo não gravam sobre os dados reais. Recarregar ou sair da demonstração retorna aos dados reais.
- Em **Ajustes → Backup**, exporte um JSON com os dados e imagens. A restauração valida versão, relações, IDs, valores, datas e formato dos anexos antes de pedir confirmação para substituir os dados atuais. Limite de importação: 100 MB; foto individual: 5 MB.

## Armazenamento e funcionamento offline

- Android: `Directory.Data`, arquivo privado `data.json` e imagens persistentes em `images/`. Escrita primeiro em arquivo temporário, seguida da troca do JSON. Limpeza das imagens antigas somente após salvar o novo documento. Backup automático do Android está desabilitado, incluindo nuvem e transferência entre aparelhos.
- Web: `localStorage`, chave `contas-em-dia-v1`. Fotos são data URLs. O limite do navegador costuma ser menor que o do Android; quando falta espaço, a operação mostra erro e não atualiza o estado da interface. É uma prévia funcional, não um armazenamento ilimitado de fotos.
- O build web instala cache offline na primeira visita. A prévia de desenvolvimento em 5173 precisa do Vite ativo; o Android inclui todos os arquivos e não depende desse servidor.
- `version: 1` e `migrate()` são o ponto de entrada de migrações. Não há formato anterior a migrar nesta primeira versão; versões desconhecidas são rejeitadas sem sobrescrever dados. Futuras mudanças devem adicionar conversões explícitas.
- Atualize o Android mantendo o mesmo applicationId e assinatura e aumentando versionCode; não desinstale para atualizar. Desinstalar, limpar dados ou limpar o armazenamento do navegador pode apagar dados. Recuperação exige backup exportado pelo usuário.

## Gerar e instalar no Android

O projeto `android/` já foi criado, sincronizado e compilado com JDK 21, SDK Platform 35 e Build Tools 34.0.0. O APK de teste foi gerado com sucesso. A instalação e os testes no celular ainda estão pendentes. Veja também `ANDROID-USB.md`.

1. Instale [Android Studio](https://developer.android.com/studio). Pelo SDK Manager, instale Android SDK Platform 35, Build Tools e Platform Tools; configure Gradle JDK 21. Para emulador, instale uma imagem Android e crie um dispositivo virtual.
2. Na pasta do projeto, execute:

```powershell
# Apenas nesta sessão, caso use o Node local incluído:
$env:PATH = "$PWD\.tools\node-v22.16.0-win-x64;$env:PATH"
npm.cmd run android:sync
npm.cmd run android:open
```

3. Aguarde o Gradle sincronizar no Android Studio. Conecte um celular com depuração USB autorizada, ou inicie o emulador. Selecione o dispositivo e clique **Run** para compilar e instalar. Alternativa: `npx.cmd cap run android`. Veja o [fluxo oficial do Capacitor Android](https://capacitorjs.com/docs/android).
4. Para um APK de teste, em terminal com SDK configurado: `cd android` e `.\gradlew.bat assembleDebug`. O arquivo fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Instale com `adb install -r caminho-do-apk` ou abra o APK no aparelho e autorize a instalação daquela origem.
5. Para uma versão permanente, gere um APK assinado pelo Android Studio e guarde a chave. Use essa mesma chave nas atualizações. `android/app/build.gradle` contém `versionCode` e `versionName`.

Depois de mudar o código web, execute novamente `npm run android:sync` antes de recompilar. A primeira compilação precisa de internet para baixar dependências; o aplicativo instalado funciona offline.

## Lembretes

Ative em Ajustes no Android. A permissão só é solicitada quando você toca em ativar. Cobranças não pagas são programadas para dois dias antes do vencimento, às 9h no horário local do aparelho; datas passadas são descartadas. Pagar, excluir, restaurar ou editar reconcilia a programação. Mensais são projetadas para os próximos 12 meses, renovados quando o app abre ou volta ao primeiro plano; não geram cobranças futuras no histórico real. O cálculo em meses usa o último dia quando necessário.

O Android pode exigir autorização adicional para alarmes exatos; sem ela, a entrega pode ser aproximada. Permissões, economia de bateria e restrições do aparelho precisam de validação real. A prévia web informa a limitação e **não simula entrega de notificações Android**. Referência: [Local Notifications](https://capacitorjs.com/docs/apis/local-notifications).

## Código e verificação

- `src/domain.ts`: entidades, datas, centavos, recorrência e demonstração.
- `src/storage.ts`: validação, fronteira de migração, adaptadores, imagens e backup.
- `src/notifications.ts`: permissões e reconciliação de notificações.
- `src/main.tsx` / `src/style.css`: telas, formulários e layout responsivo.
- `tests/`: testes de regras, programação de lembretes com API substituída e fluxos reais em Chromium.
- `screenshots/`: capturas desktop e celular da demonstração.

```powershell
npm.cmd test
npm.cmd run build
# Com a prévia 5173 e o build servido na porta 4173:
npx.cmd vite preview --host 127.0.0.1 --port 4173
npm.cmd run test:e2e
```

O relatório `VERIFICACAO.md` diferencia os testes executados das verificações pendentes no Android.
