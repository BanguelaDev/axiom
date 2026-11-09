# Entregas do AXIOM

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
