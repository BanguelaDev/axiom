# Entregas do AXIOM

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
