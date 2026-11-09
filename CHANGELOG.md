# Entregas do AXIOM

## Validação do candidato Android — 9 de novembro de 2026

APK 0.12.0 compilado pelo GitHub Actions a partir de 914f341. Assinatura verificada no build e checksum conferido após download. Pacote ainda em rascunho de release.

Testes nativos preparados com Maestro CLI e emuladores Android 10/API 29 e Android 14/API 34. Exercitam conexão, restauração, geração com fixture, pausa, avanço, serviço de mídia e continuidade fora do app e com tela bloqueada. O servidor do teste usa conteúdo fictício e áudio técnico, sem Gemini ou chaves. Evidências ficam junto ao candidato; o resultado será registrado após a execução.

Limpeza RSS corrigida para remover HTML escapado depois da decodificação, incluindo blocos de script/style. 27 testes direcionados aprovados. Nova edição real de IA gerada em 120,03 segundos após indisponibilidade temporária do fornecedor. A versão do APK continua 0.12.0 porque essa alteração pertence ao servidor.

## 0.12.0 — 9 de novembro de 2026

**Etapa 12: operação do servidor local.** Relatos por episódio e notas de voz de 1 a 5, sem cadastro ou texto livre. Comando administrativo local para retirar edições e impedir novas leituras de links já emitidos. Player confere disponibilidade ao iniciar/retomar e periodicamente. Registro da primeira publicação entre coletas, com hash da URL.

Relatório local com reuso, fases, falhas, tentativas, caracteres e tokens informados pela IA. Política de retenção com simulação, quarentena e limpeza restrita às pastas do pipeline. Dados financeiros não são estimados como se fossem medidos.

113 testes aprovados, TypeScript/Deno, lint, exportações web/Android/iOS e Expo Doctor 20/20. A primeira compilação nativa identificou Reanimated indireto 4.2.2 incompatível com React Native 0.88.1; dependências alinhadas ao Expo SDK 58 (Reanimated 4.7.1 e Worklets 0.13.0). APK será recompilado. Fraudes ficou sem fontes recentes suficientes na nova coleta, mantendo o bloqueio editorial.

Revisão do servidor: “golpes de faca” não define Fraudes e Golpes. O termo isolado agora exige contexto financeiro ou digital; fraude, phishing, estelionato e golpistas continuam explícitos. Teste de regressão acrescentado; 26 testes direcionados aprovados. Essa correção é do servidor e não altera o binário mobile 0.12.0.

## 0.11.0 — 9 de novembro de 2026

**Etapa 11: candidato Android com servidor configurável.** Tela para conectar ao computador, validação da API e persistência do endereço. Trocar de servidor remonta o player e cancela pedidos da conexão anterior. Sessões separadas por endereço. Modo local explicitamente habilitado no build, sem incorporar endereço pessoal ou chaves.

Configuração nativa gerada pelos plugins do Expo com serviço de mídia, HTTP para a rede local e suporte ao tema do sistema. Comando `server:lan` para executar a API sem Metro. Compilação Gradle em executor público padrão do GitHub, com APK, checksum e commit em rascunho de release; instalação e segundo plano continuam pendentes até teste do candidato.

Verificação local: 109 testes, TypeScript/Deno, lint e Expo Doctor 20/20. Conexão real e rejeição de endereço público conferidas na prévia. A confirmação do responsável encerra o defeito da barra e do aviso no Expo Go.

## 0.10.0 — 9 de novembro de 2026

**Etapa 10: fontes e teste Android.** Lote RSS distribuído entre grupos editoriais antes do limite de 50; publicação mais antiga preservada antes do corte e datas de calendário inválidas rejeitadas. Feed atual do g1, fonte especializada em psicologia e recortes refinados para evitar menções incidentais a crimes e golpes.

Acesso Android com QR local e manifesto conferido. Corrigidos largura e comportamento da barra: contínua, proporcional e com busca ao soltar no Android. O Expo Go não tenta iniciar os controles de tela bloqueada que exigem o binário do app. Abertura, reprodução e correção da barra confirmadas pelo responsável em Galaxy Note 20 Ultra.

Verificação: 108 testes, TypeScript/Deno, lint, exportações web/Android/iOS e Expo Doctor 20/20. Ucrânia, IA e Crimes gerados e medidos em 120,03 segundos; Fraudes teve uma versão rejeitada editorialmente e Saúde Mental ficou sem material elegível. Serviço nativo e segundo plano serão testados no APK.

## 0.9.0 — 9 de novembro de 2026

**Etapa 9: persistência local.** SQLite guarda sessões, pedidos, associações, cotas e registros privados do áudio aprovado. Reiniciar preserva o reuso de episódios válidos e identifica preparações interrompidas, sem repetir o fornecedor. Tokens persistidos como hashes; gravação atômica, detecção de concorrência e falha segura para banco incompatível. Reserva local sem espera intermediária que pudesse duplicar pedidos.

Verificação: 103 testes, TypeScript/Deno e lint. Testes reiniciam API HTTP, recuperam sessão e pedido, mantêm cotas e reutilizam áudio aprovado com FFmpeg real. Servidor na rede local preparado para Android sem cabo. Por escolha do responsável, hospedagem remota e lojas são evoluções opcionais da entrega local.

## 0.8.0 — 9 de novembro de 2026

**Etapa 8: entrega acadêmica e validação real do fluxo gratuito.** Primeiro episódio com notícias e narração Gemini gerado e medido em 120,03 segundos. Catálogo de evidências literais, descarte auditado de fatos com números sem suporte, créditos antes da revisão e seleção de parágrafos completos para o orçamento de palavras. Uma correção editorial orientada pelo motivo de rejeição, com nova revisão obrigatória. Calibração de ritmo de até 10% para a voz gratuita, sem cortar fala ou acrescentar silêncio.

Corrigidos caminhos temporários longos no Windows e perda do ponto de escuta ao carregar um episódio. Sessão local rejeitada é renovada uma única vez. Atualização compatível com Expo SDK 58, ícone original, guia de apresentação e informações sobre dados.

Verificação: 99 testes, TypeScript/Deno, lint, exportações web/Android/iOS e Expo Doctor 20/20. Episódios reais de IA e Política; reprodução, pausa, busca, fontes, histórico e retomada conferidos na prévia, também em largura de 390 pixels. Avaliação com ouvintes, teste em aparelhos físicos, serviços remotos e lojas continuam pendentes. Os resultados estão em [validação](docs/validation.md). Nenhum fallback pago foi adicionado.

## 0.7.0 — 8 de novembro de 2026

**Etapa 7: jornada mobile integrada e custo zero.** Geração e consulta de fila pela API, player de episódios com mídia temporária, fontes, retomada e histórico. RSS público e Gemini Free Tier substituem o fluxo pago; não há fallback pago. API/fila local ligadas ao pipeline, comandos de execução no computador e na rede do celular, worker remoto preparado como opção. Guia simplificado de uma única chave gratuita.

Verificação: TypeScript/Deno, lint, 88 testes e exportação web. Coleta RSS real e navegação de configuração pendente verificadas. Chave Gemini, síntese real, avaliação humana e aparelho físico ainda pendentes; nenhuma chamada paga realizada.

## 0.6.0 — 8 de novembro de 2026

**Etapa 6: processamento de áudio e preparação da publicação.** Voz com limites e erros seguros, reaproveitamento da síntese por versão, até três roteiros revisados e medição real de duração, silêncio e volume. Arquivo final normalizado, com ajuste de ritmo de até 3%. Adaptador de publicação privada e migração transacional, com conferência de integridade e repetição sem duplicar o episódio. Nova apresentação com sinal técnico de dois minutos e exemplos de bloqueio.

Verificação: TypeScript/Deno, lint, exportação web, 76 testes e auditoria com FFmpeg real. Reprodução, pausa, progresso e bloqueios conferidos na prévia, também em 390 pixels. Voz e Storage usam respostas controladas; migrações executadas em PostgreSQL embarcado. Fornecedores reais, avaliação humana, fila e publicação remota continuam pendentes; geração de produção desativada.

## 0.5.0 — 8 de novembro de 2026

**Etapa 5: roteiro e revisão no servidor.** Extração de fatos, redação e revisão por afirmação, com evidências, referências e controles antes da voz. Material insuficiente, citações inválidas, números novos, atribuição perdida, revisão incompleta e alterações após aprovação são bloqueados. Prova de viabilidade integrada a registros privados. Nova apresentação dos controles, sem expor o roteiro.

Verificação: TypeScript/Deno, lint, 67 testes, auditoria fictícia dos seis temas e exportação web. O SDK foi exercitado com respostas HTTP controladas, sem chamar fornecedores. Qualidade factual real, revisão humana, custos e persistência remota continuam pendentes; geração de produção desativada.

## 0.4.0 — 8 de novembro de 2026

**Etapa 4: coleta e seleção auditável.** Consultas em português/inglês para os seis temas, coleta limitada com tratamento de falhas, datas estritas, janela de 72 horas, filtros, deduplicação e agrupamento. Cadastro de fontes revisadas e contagem conservadora de vínculos editoriais e créditos de agência. Relatório privado conectado à prova de viabilidade. Nova apresentação no app e auditoria por terminal com exemplos fictícios.

Verificação: TypeScript/Deno, lint, 50 testes, auditoria dos seis temas e exportação web. Cobertura real, classificação por LLM, calibração editorial, direitos de conteúdo e persistência remota continuam pendentes. Geração desativada e nenhuma chamada real de notícias, IA ou voz nesta entrega.

## 0.3.0 — 8 de novembro de 2026

**Etapa 3: base técnica e conexão local.** API com validação de sessão, cliente anônimo Supabase, verificação de conexão no app e runner HTTP descartável. Migração transacional para associação de sessões, reuso, quotas e uma reserva ativa por tema. Metadados operacionais restritos, bucket privado e URLs temporárias. Configuração inicial do Trigger.dev, com geração desativada até a integração validada do pipeline.

Verificação: TypeScript, lint, 31 testes, exportação web, checagem Deno da Edge Function e conexão/falha/retomada na prévia. Migrações testadas em PostgreSQL embarcado; Supabase completo, fila remota e fornecedores continuam pendentes. Nenhum serviço remoto foi implantado ou usado para gerar áudio.

## 0.2.0 — 8 de novembro de 2026

**Etapa 2: UX e identidade.** Jornada de escolha do tema até o player, preparação cancelável, estados de falta de notícias e falha com recuperação. Mini player nas abas, retomada de escuta, histórico validado e preferências com gravação serializada. Identidade e contraste revisados em claro/escuro. Cenários simulados separados da geração real.

Verificação: TypeScript, lint, 17 testes automatizados e revisão da prévia em largura mobile. Avaliação com usuários e testes nativos permanecem pendentes.

## 0.1.0 — 19 de outubro de 2026; publicado no GitHub em 8 de novembro de 2026

**Base do projeto e início da etapa 1.** Aplicativo Expo, seis temas, player com amostra original de 12 segundos, prova de viabilidade local para notícias, roteiro, voz e duração, proposta inicial do banco e verificações automáticas. Os dois roadmaps e a identificação acadêmica foram preservados.

Verificação inicial: TypeScript, lint, nove testes e exportação web. Não houve chamadas reais aos fornecedores nem aplicação da migração SQL. A etapa 1 depende das credenciais e da revisão de conteúdo e voz.
