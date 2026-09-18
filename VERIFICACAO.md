# Verificação — 17/09/2026

## Atualização Android — 18/09/2026

Android Studio e SDK encontrados. Instalados SDK Platform 35 e Build Tools 34.0.0 pelo Gradle. Projeto aberto com `npm run android:open` e sincronizado com `npm run android:sync`. Compilação nativa `assembleDebug` concluída: **BUILD SUCCESSFUL**, APK gerado em `android/app/build/outputs/apk/debug/app-debug.apk` (4.318.997 bytes).

Resolvidos o bloqueio de caminho com acento (`android.overridePathCheck=true`) e o erro de interpretação Unicode do compilador Kotlin (`kotlin.compiler.execution.strategy=in-process`). Usado JDK 21. A lista `adb devices -l` continua vazia; instalação e testes no aparelho ainda não executados. As observações abaixo sobre ausência do SDK registram o estado da entrega inicial, agora superado.

## Executado

- Build TypeScript/Vite de produção concluído.
- Projeto Android criado e sincronizado com `cap sync android`, incluindo Filesystem, Local Notifications e Share.
- 12 testes automatizados de lógica: geração de meses faltantes, idempotência, datas no fim do mês e ano bissexto, preservação de histórico, parcelas, pagamento único, exclusões persistentes, backup, valor ausente versus zero e cálculo/reconciliação de lembretes.
- Chromium desktop 1440 × 1080 e celular 390 × 844: cadastro de imóvel e conta; edição; anexar conta e comprovante; pagamento; persistência depois de recarregar; navegação entre meses sem duplicação; três parcelas; consulta ao histórico; exportação e restauração; rejeição de backup incompatível; isolamento da demonstração; desfazer pagamento.
- Segundo fluxo Chromium: simulação de quota esgotada com erro de salvamento e manutenção do formulário; nova tentativa bem-sucedida; edição do imóvel; rejeição de imagem danificada; pagamento único com valor zero; cancelamento e confirmação de exclusão; exclusão que não reaparece depois de recarregar; exclusão do imóvel.
- Capturas da demonstração em `screenshots/desktop.png` e `screenshots/mobile.png`, inspecionadas visualmente. Sem rolagem horizontal na largura de 390 px.
- Auditoria npm após atualização das dependências de teste: nenhuma vulnerabilidade reportada.
- Terceiro fluxo Chromium aprovado: build web carrega, instala cache e reabre com a rede desligada. Corrigida a correspondência de cache de arquivos estáticos servidos com cabeçalho Vary.
- Resultado final: **12 testes de lógica + 3 testes de fluxos no navegador aprovados**. Prévia de desenvolvimento verificada com HTTP 200 em `http://127.0.0.1:5173/`; build de produção disponível em `http://127.0.0.1:4173/`.

## Limites da verificação

Os testes de notificações usam uma substituição da API para verificar os horários calculados, cancelamento e bloqueio de datas passadas. **Não comprovam entrega de notificações em um Android.**

Não há Android Studio/SDK nos caminhos usuais deste computador. Java 21 está disponível, mas nenhum APK foi compilado e nenhum aparelho/emulador foi usado. Ainda validar no Android:

1. Compilar, instalar e abrir em modo avião.
2. Gravar JSON e fotos; fechar forçadamente, reiniciar e conferir persistência.
3. Selecionar fotos e compartilhar/restaurar backups pelo seletor nativo.
4. Aceitar e negar permissões de notificação e alarmes exatos. Conferir lembrete real às 9h, dois dias antes; editar vencimento, pagar, desfazer pagamento e excluir para conferir cancelamentos.
5. Reiniciar o aparelho e verificar restauração dos lembretes pelo plugin. Repetir com economia de bateria e app em segundo plano.
6. Instalar uma atualização assinada com a mesma chave sobre a anterior, sem desinstalar, e conferir os dados.
7. Simular pouco espaço no dispositivo e interrupção durante salvamento para verificar o comportamento nativo de troca do arquivo JSON.

O navegador usa localStorage; o Android usa arquivos privados. O sucesso de um adaptador não foi apresentado como validação do outro.
