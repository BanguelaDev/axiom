# Validações do AXIOM

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
