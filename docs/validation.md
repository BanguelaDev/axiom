# Validações do AXIOM

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

## Ainda não validado

Notícias reais dos seis temas, credenciais e quotas dos fornecedores, independência editorial das fontes, fidelidade de roteiros reais, qualidade da voz em português, Supabase, Trigger.dev, acessibilidade nativa, Android/iPhone físicos, segundo plano, Bluetooth, builds e lojas. Não foi gerado um episódio jornalístico real.

## Dependências a acompanhar

Nesta entrega, `npm audit` sinaliza 20 avisos (1 baixo, 16 moderados e 3 altos), propagados pela cadeia Expo: `deepmerge`, `glob`, `minimatch`, `node-forge`, `uuid` e uma versão transitiva de `zod` no CLI. A dependência direta de Zod é 4.6.7. Nenhuma atualização forçada de SDK foi aplicada; a sugestão automática inclui regressão para Expo 52, incompatível com o SDK 58. Reavaliar correções dos fornecedores antes de builds de distribuição. A aprovação das verificações não resolve esses avisos.

## Documentação usada nas integrações

- [Expo Audio, SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/)
- [Expo Router, SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/)
- [OpenAI: saídas estruturadas na Responses API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [GNews: endpoint de busca](https://docs.gnews.io/endpoints/search-endpoint)
- [ElevenLabs: síntese de voz](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
