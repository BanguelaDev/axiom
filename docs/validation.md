# Validações do AXIOM

## Situação atual — Expo Go e servidor local, versão 0.12.1

O responsável dispensou o APK e escolheu concluir diretamente no Expo Go. Os testes de binário abaixo são registros experimentais; não impedem a entrega escolhida.

| Verificação | Resultado |
| --- | --- |
| Código do servidor e app | 116 testes, TypeScript/Deno e lint aprovados |
| Expo | Doctor 20/20; exportações web e Hermes Android/iOS aprovadas |
| Episódios reais | MP3 medidos em 120,032653 segundos; fontes e revisão privadas |
| Avaliação inicial da voz | Um ouvinte: clareza 5/5 e naturalidade 5/5 |
| Android físico com Expo Go | Abertura, reprodução e correção da barra confirmadas em Galaxy Note 20 Ultra |
| APK independente 0.12.1 | Compilado, assinado para testes, checksum conferido e publicado como pré-release |
| Android 14 emulado, mesmo APK | Conexão/restauração, reprodução, pausa, avanço, segundo plano e tela apagada aprovados |
| Android 10 emulado, APK opcional | Automação não aprovada; investigação encerrada após mudança de escopo |
| APK no celular físico | Dispensado pelo responsável; fora do aceite |
| Segundo plano/tela bloqueada no Expo Go | Serviço nativo não é acionado; fora do aceite escolhido |
| Bluetooth, chamadas e acessibilidade física | Não avaliados |

[Baixar a versão](https://github.com/BanguelaDev/axiom/releases/tag/v0.12.1). [Build do APK](https://github.com/BanguelaDev/axiom/actions/runs/42686834811). Fonte do APK: `67208d57bc5dc433c499ccca8a7c4684302825a8`. SHA-256: `8d8349577f150d8291300624b0ea9eca5bb967b0bc772285f5188af107515b19`.

O [teste final do Android 14](https://github.com/BanguelaDev/axiom/actions/runs/42690687582/job/129409307566) usa conteúdo fictício e áudio técnico, sem Gemini ou chaves. O job do Android 14 passou; o resultado global da execução inclui a falha separada do Android 10. Conferidos MediaSession PLAYING, posição avançando, AudioTrack STARTED, serviço foreground e energia `Asleep`. Isso comprova saída de áudio ativa no emulador; não substitui escuta em aparelho físico.

Inspeção do APK: arm64-v8a e x86_64, sem `.env`, marcadores do pipeline privado, IP pessoal ou as quatro chaves locais conferidas. Nenhum valor de chave foi exibido. O servidor atualizado contém mudanças posteriores ao build: abertura falada removida e calibração de roteiro. Elas não exigem reinstalar o APK.

A avaliação 5/5 corresponde à amostra de IA gerada às 15:14 de 9 de novembro, com 120,03 segundos. A pedido do responsável, os próximos episódios começam diretamente no assunto. O lembrete final das fontes permanece. O envio do texto sem apresentação e a calibração passaram nos testes; a tentativa de gerar nova amostra completa encontrou a cota gratuita de voz (HTTP 429). Não houve fallback pago nem uma nova amostra real aprovada depois dessa alteração.

A cobertura por RSS varia: na última auditoria, Ucrânia, IA, Política e Crimes tinham material; Saúde Mental e Fraudes estavam insuficientes. Não se ampliam as 72 horas para preencher uma pauta. O beta de cinco episódios por tema, iPhone físico, lojas e hospedagem Supabase/Trigger.dev não integram o aceite local escolhido.

As seções abaixo preservam o histórico de cada etapa. Dependências antigas indicadas como pendentes devem ser lidas na data do registro.

## Etapa 10 — Fontes e Android físico

- 108 testes, TypeScript/Deno, lint, exportações web/Android/iOS e Expo Doctor aprovados.
- Regressões de diversidade antes do limite, datas impossíveis, republicação, proporção da barra e capacidades do player no Expo Go.
- Auditoria dos seis temas: cinco pautas suficientes; Saúde Mental sem conteúdo elegível. Notícias antigas ou textos curtos não completam o tema.
- Pela API: Ucrânia, IA e Crimes com MP3 de 120,032653 segundos; Fraudes bloqueado na revisão. Relatórios e áudios privados em `work/live-check`.
- Confirmado pelo responsável em Galaxy Note 20 Ultra: abertura, reprodução e correção da barra após recarregar, sem novo aviso.
- O Expo Go registrou falha de vínculo do serviço de áudio. O APK deverá validar a configuração nativa; segundo plano e controles não foram presumidos como aprovados.

## Etapa 9 — Persistência local

- 103 testes aprovados, TypeScript/Deno e lint sem erros.
- SQLite reaberto com sessão válida, sem o token original no arquivo. Expiração e credencial inválida recusadas.
- Reinício HTTP preserva a associação do pedido, informa interrupção e não repete o fornecedor. Cotas permanecem válidas após reabrir o banco.
- Áudio aprovado por FFmpeg recuperado após recriar o repositório e o banco; novo acesso emitido sem síntese. Cache expirado com pedidos concorrentes gera uma única reserva.
- Estado incompatível e gravação concorrente falham sem apagar ou substituir silenciosamente os dados.

O teste com aparelho Android sem cabo será registrado separadamente. Hospedagem remota e lojas não fazem parte do escopo local confirmado pelo responsável.

## Etapa 8 — 9 de novembro de 2026

- TypeScript/Deno, lint e Expo Doctor: aprovados, com 20/20 verificações no Doctor.
- 99 testes automatizados aprovados, incluindo regressões com FFmpeg real e correção editorial limitada.
- Exportações web e JavaScript/Hermes para Android e iOS aprovadas. Não são APK/IPA ou teste em aparelho físico.
- Primeiro episódio jornalístico real de IA: 120,032653 segundos, MP3 mono a 44.100 Hz, 1.920.984 bytes, −17,51 LUFS e pico de −1,85 dBTP. Matérias de The Guardian e g1 com datas dentro das 72 horas; roteiro e revisão privados.
- Na prévia: geração até pronto, acesso ao player sem reprodução automática, reprodução, pausa, avanço/retorno de 15 segundos, fontes, mini player e histórico após recarregar.
- Segundo episódio real, em Política, também com 120,032653 segundos, −17,31 LUFS e pico de −1,98 dBTP, usando g1 e Agência Brasil. Retomada efetiva após recarregar confirmada a partir do ponto salvo em 26 segundos, sem zerar durante o carregamento. Layout revisto em 390 × 844 pixels.
- Regressões: nomes temporários longos no Windows, evidências literais, referência inventada, número sem suporte, orçamento de parágrafos, correção editorial limitada e interrupção de cota sem nova chamada.
- Auditoria RSS atual: quatro temas com material suficiente. Saúde Mental e Crimes continuam sujeitos à insuficiência; a janela não é ampliada.
- Auditoria npm: 12 ocorrências moderadas, sem altas ou críticas após atualizações compatíveis. Atualização forçada para outro SDK não foi aplicada.

A narração e os roteiros precisam de avaliação humana; os testes técnicos não comprovam fidelidade semântica nem naturalidade. Aparelhos Android/iOS físicos, segundo plano, Bluetooth, beta, Supabase completo, Trigger.dev e lojas continuam pendentes.

## Etapa 6 — 8 de novembro de 2026

- TypeScript/Deno, lint e exportação web: aprovados.
- 76 testes aprovados: os 67 anteriores e nove sobre voz, renderização, publicação e transação. FFmpeg real mede e processa arquivos; não são apenas durações declaradas.
- Amostra final com 120,01 segundos; silêncio e duração de 150,05 segundos bloqueados na auditoria `audit:audio`.
- Verificados: cache da síntese, versão alterada, limite de três versões, silêncio e pausa longa, integridade do arquivo, endereço temporário, leitura parcial e expiração.
- Adaptador ElevenLabs exercitado com transporte HTTP controlado: formato, quota, MIME, resposta vazia, limite de bytes e falha de rede, sem repetição automática nem exposição de dados privados.
- Publicação com Storage controlado e SQL em PGlite: acesso restrito ao servidor, idempotência, rollback de metadados inválidos e recuperação após confirmação incerta sem apagar o objeto. Isso não valida o serviço Supabase completo.
- Prévia: navegação e Fast Refresh confirmados. Preparação sem reprodução automática, reprodução, pausa com avanço do progresso, bloqueio por silêncio e por duração fora da margem e recuperação para amostra pronta. Tela revisada em 390 pixels; aba preservada para acompanhamento.
- Sem fornecedores reais, avaliação humana da narração, publicação remota ou integração com a fila. Geração de produção desativada.

## Etapa 5 — 8 de novembro de 2026

- TypeScript/Deno, lint e exportação web: aprovados.
- 67 testes aprovados: os 50 anteriores e 17 novos sobre o fluxo editorial e o adaptador OpenAI. Incluem material insuficiente, citações, referências, números em dígitos, atribuição, diversidade, revisão de outra versão, alterações posteriores e expiração das fontes.
- SDK real exercitado com transporte HTTP substituído: três schemas de saída estruturada, `store: false`, ferramentas desativadas, recusa, resposta incompleta, formato incompatível e erro sem chave ou resposta privada.
- Os três cenários de demonstração passaram nos seis temas: aprovação, evidência ausente e contradição. Isso valida o fluxo, não a capacidade semântica de uma IA real.
- Na prévia: recuperação de sessão, demonstração aprovada, evidência ausente bloqueada antes da redação e contradição bloqueada antes da voz. Tela revisada em 390 pixels, com o tema longo de Redes Sociais e Saúde Mental. Nenhum roteiro ou trecho de evidência é mostrado.
- Sem chamadas reais à OpenAI, GNews ou ElevenLabs e sem implantação remota. Qualidade factual, avaliação humana e custos continuam pendentes.

## Etapa 4 — 8 de novembro de 2026

- TypeScript/Deno, lint e exportação web: aprovados.
- 50 testes aprovados: os 31 anteriores e 19 novos sobre datas estritas, seleção dos seis temas, cópias/agrupamentos, fontes e agência, cadastro, API de apresentação e chamadas GNews controladas.
- Auditoria local gera os seis relatórios fictícios com decisões de seleção/descarte, sem notícias reais, roteiro ou conteúdo completo na resposta do app.
- Prévia web em 390 pixels: seleção pronta, troca para o tema longo de Redes Sociais e Saúde Mental, cenário de fontes insuficientes e retomada após sessão descartada. As decisões e datas são exibidas; não há reprodução ou geração automática de áudio.
- A mesma URL preserva a publicação mais antiga observada no lote; um teste impede renovar uma notícia antiga com outra data. A comparação entre lotes ainda requer histórico persistente.
- Filtros e agrupamento são heurísticos. Ainda não validam pertinência semântica, propriedade editorial ou cobertura dos seis temas com notícias reais.
- Não houve chamadas reais ao fornecedor nem alteração de serviços remotos. A geração continua desativada.

## Etapa 3 — 8 de novembro de 2026

- TypeScript, ESLint e exportação web: aprovados.
- 31 testes aprovados: os 17 anteriores, mais 14 sobre API, autenticação, isolamento entre sessões, erros seguros, limites de payload e origem, cliente HTTP, migrações, RLS, quotas, reuso, trabalhos abandonados e URLs temporárias.
- As duas migrações foram executadas em PostgreSQL embarcado (PGlite) com contratos mínimos dos schemas Auth/Storage; permissões e políticas exercitadas por uma role de cliente. Não é um teste do serviço Supabase completo ou de concorrência entre processos.
- Edge Function verificada com Deno 2.9.6. Essa verificação integra `npm run typecheck`, já executado pelo GitHub Actions, sem alterar o arquivo do workflow.
- Na prévia web: sessão local, catálogo dos seis temas, servidor interrompido, mensagem de falha e recuperação por nova tentativa.
- A exportação web não contém os nomes das variáveis secretas dos fornecedores ou service_role. Somente configuração pública e contratos do cliente entram no app.
- Supabase remoto, Auth/Storage reais, Trigger.dev e fornecedores não foram acionados. Geração desativada; nenhuma nova amostra jornalística foi produzida.

## Etapa 2 — 8 de novembro de 2026

- TypeScript e ESLint: aprovados.
- 17 testes automatizados aprovados: os nove originais, mais cenários de preparação pronta/vazia/falha, cancelamento e resposta antiga, preferências incompatíveis, retomada e contraste em claro/escuro.
- Fluxo revisado na prévia web em largura mobile: detalhe do tema → preparação simulada → player, sem áudio automático.
- Cancelamento retorna ao tema e interrompe a tentativa. Cenários de falta de notícias e falha exibem explicação e saída; nova tentativa chega ao estado pronto.
- Reprodução, pausa e busca na amostra verificadas; mini player nas abas e ponto de escuta no histórico confirmados.
- Tema claro revisado, incluindo o controle de seleção que antes herdava cores escuras do navegador.
- A configuração dos fornecedores continua pendente. Não foram executadas chamadas reais de notícias, LLM ou voz; o banco e a fila remota não foram implantados.

O protótipo está pronto para revisão visual. Avaliação com usuários e testes com texto ampliado, leitores de tela, Android e iPhone físicos continuam pendentes.

## Primeira entrega — 19 de outubro de 2026

- TypeScript: aprovado no núcleo, na prova de viabilidade e no aplicativo.
- ESLint do Expo: aprovado, sem erros ou avisos.
- Testes automatizados: 9 aprovados. Incluem limites exatos de 72 horas, datas futuras, deduplicação, diversidade mínima, expiração durante a geração, evidências alteradas, fontes desconhecidas, proteção do roteiro e ajuste de duração.
- FFmpeg/FFprobe: teste com arquivo real de 122 segundos convertido para 120 segundos dentro da tolerância de um segundo.
- Expo Doctor: 20 de 20 verificações aprovadas.
- Exportação da prévia web: aprovada. O áudio usa APIs do navegador e a prévia é exportada como aplicação de página única.
- Navegação na prévia em largura de 390 pixels: tema, player, fontes e abas de histórico/preferências.
- Reprodução efetiva da amostra de 12 segundos, pausa, controle de progresso e retorno ao início.
- Histórico local, restauração após recarregar e limpeza com estado vazio.
- Troca para tema claro, persistência e recuperação de tema inválido.
- Verificação de configuração: identificou corretamente as credenciais e permissões ainda pendentes, sem fazer chamadas externas.

## Validações que continuam pendentes

Cobertura e revisão humana dos seis temas, independência editorial das fontes em escala, fidelidade de roteiros, qualidade da voz com ouvintes, Supabase, Trigger.dev, acessibilidade nativa, Android/iPhone físicos, segundo plano, Bluetooth, APK/IPA e lojas.

## Dependências a acompanhar

Etapas 10–12: abertura, reprodução e barra/arraste confirmados pelo responsável no Galaxy Note 20 Ultra usando Expo Go. O aviso de serviço nativo deixou de ocorrer nesse ambiente. A versão do Android e a nota de voz de 1 a 5 não foram confirmadas. Reanimated foi alinhado a 4.7.1 após a compilação Gradle detectar incompatibilidade na dependência indireta anterior. Serviço de tela bloqueada exige teste no APK próprio.

Etapa 12: 113 testes aprovados; novos casos cobrem publicação original entre reinícios, retirada de tickets de áudio, avaliação autenticada e retenção com quarentena. TypeScript/Deno, lint, exportações web e Hermes Android/iOS aprovadas. Expo Doctor 20/20. A nova coleta de Fraudes não tinha fontes suficientes; não foi produzida narração.

Na versão 0.8, `npm audit` sinaliza 12 ocorrências moderadas nas cadeias de `glob`/`minimatch` do Expo e ESLint. A dependência direta de Zod é 4.6.7. Nenhuma atualização forçada de SDK foi aplicada; a sugestão automática inclui regressão para Expo 52, incompatível com o SDK 58. Reavaliar correções dos fornecedores antes de builds de distribuição.

## Documentação usada nas integrações

- [Expo Audio, SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/)
- [Expo Router, SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/)
- [OpenAI: saídas estruturadas na Responses API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [GNews: endpoint de busca](https://docs.gnews.io/endpoints/search-endpoint)
- [ElevenLabs: síntese de voz](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Etapa 7 — Integração e custo zero

- TypeScript/Deno, lint, 88 testes e exportação web aprovados.
- Novos testes: saída estruturada Gemini, chave no header, store=false, interrupção em 429 sem retry/fallback pago, voz WAV, RSS sem entidades e links fora da fonte, contratos do player, POST autenticado, mídia temporária e histórico sem dados privados.
- Fila local exercitada com áudio real: trabalho compartilhado, uma execução, isolamento de sessões, metadados sem roteiro, cache e expiração.
- Coleta RSS real consultada sem chaves: Ucrânia, IA, Fraudes e Política com material suficiente na primeira auditoria. Saúde mental e Crimes insuficientes naquele instante. Essa leitura não garante cobertura futura nem qualidade editorial aprovada.
- Prévia: navegação do tema ao novo fluxo e tratamento de geração desativada. Gemini real ainda não foi chamado; chave Free Tier pendente. Reprodução jornalística, avaliação humana e aparelhos físicos ainda não aprovados.
- A configuração do build opcional Trigger.dev acrescenta duas ocorrências altas à auditoria de dependências: total 22 (1 baixa, 16 moderadas, 5 altas). Sem atualização forçada de SDK; não usar esta entrega como aprovação de distribuição em loja.
