# Acompanhamento das etapas

## Etapa 1 — Notícias, IA e voz: em andamento

Implementados: catálogo dos seis temas; seleção na janela de 72 horas; deduplicação; exigência de veículos distintos; evidências literais por afirmação; revisão estruturada; integrações de GNews, OpenAI e ElevenLabs; medição e ajuste limitado de duração; saída pública sem roteiro.

Pendente: configurar as contas e permissões de conteúdo, executar chamadas reais, avaliar cobertura dos seis temas e aprovar a voz com ouvintes. Não foi gerado nenhum podcast jornalístico real até aqui.

## Etapa 2 — UX e identidade: protótipo navegável implementado

Entrega de 8 de novembro de 2026, conforme as seções 3, 4 e 10 do `AXIOM-roadmap.md`:

- Marca tipográfica com sinal de áudio, cores por tema e opções claro/escuro/sistema.
- Jornada: explorar → detalhe do tema → preparação da demonstração → player → fontes.
- Preparação cancelável e cenários explícitos de falta de notícias e falha com nova tentativa.
- Mini player nas abas para retomar ou pausar a amostra sem perder o contexto.
- Histórico com ponto de escuta, validação de dados locais e gravações serializadas.
- Tratamento de falha e demora no carregamento de áudio, com nova tentativa.
- Testes de estado, retomada e contraste mínimo de 4,5:1 nos tokens de texto e ações.

A amostra continua tendo 12 segundos, sem notícias ou narração. Os passos da preparação são simulados e não representam execução de fornecedores. Os cenários ficam em Preferências → Apresentação do projeto.

Verificação na prévia web mobile: navegação, preparação, cancelamento, estados vazio/falha, recuperação, reprodução e pausa, progresso, mini player, histórico e tema claro. TypeScript, lint e testes automatizados foram executados. Veja [validação](validation.md) e [decisões de UX](ux.md).

Pendente: avaliação com usuários, ampliação de fonte e leitores de tela em aparelhos físicos e aprovação visual pelo responsável. Isso não equivale ao aceite do beta.

## Etapa 3 — Base técnica: implementação local, integração remota pendente

Entrega de 8 de novembro de 2026, seguindo as seções 6, 9, 10 e 11 do roadmap:

- API compartilhada entre runner local e Edge Function, com validação de sessão, catálogo, contratos de pedidos e respostas sem roteiro.
- App com cliente Supabase Auth anônimo e tela de verificação em Preferências → Apresentação do projeto → Verificar integração com o servidor.
- Comunicação HTTP real com a API local descartável, incluindo falha de conexão e nova tentativa. Esse runner não emula Supabase inteiro.
- Migração adicional com associação entre sessões e trabalhos, quotas, reuso, expiração e reserva transacional de uma edição por tema.
- Bucket privado e adaptador de URLs assinadas com validade limitada; metadados operacionais restritos ao servidor.
- Configuração do Trigger.dev e tarefa inicial que encerra com `integration_pending`, sem fornecedores. A geração permanece desativada na Edge Function.
- 31 testes automatizados, verificação Deno da função e verificações mobile. Migrações executadas em PostgreSQL embarcado com contratos mínimos de Auth/Storage.

Pendente: aplicar e testar em Supabase completo, configurar projetos separados e credenciais, validar Auth e Storage reais, implantar a fila, conectar o pipeline e testar concorrência distribuída. Não há Docker/Supabase CLI disponíveis neste computador. A etapa ainda não cumpre o aceite remoto; nenhum banco remoto foi alterado. Veja [base técnica](backend.md).

## Etapa 4 — Coleta e seleção: implementação local, cobertura real pendente

Entrega de 8 de novembro de 2026, conforme as seções 7.1 a 7.3, 10 e 11 do roadmap:

- Consultas próprias em português e inglês para os seis temas, com até 50 candidatos, timeout, tentativa limitada e erros seguros do fornecedor.
- Datas com horário/fuso e calendário válido, janela de 72 horas e preservação da publicação mais antiga da mesma URL dentro do lote.
- Filtros de tema e conteúdo, deduplicação por endereço e texto, agrupamento heurístico de acontecimentos e pauta de três a seis matérias.
- Cadastro explícito de domínios e grupos editoriais revisados; vínculos de proprietário e créditos de agência identificados não contam como fontes independentes.
- Relatório de decisões integrado à prova de viabilidade e guardado em arquivo privado, sem expor conteúdo completo ou roteiro.
- Apresentação dos critérios no app e comando de auditoria dos seis temas, sempre com exemplos fictícios identificados.
- 50 testes automatizados, incluindo seleção, GNews com respostas controladas e acesso à demonstração por sessão.

Pendente: validar cobertura e direitos com o fornecedor, cadastrar fontes reais, calibrar filtros e agrupamentos com revisão editorial, complementar classificação por LLM e persistir auditoria/histórico no ambiente remoto. As demonstrações não equivalem a um conjunto de notícias reais aprovado. Nenhuma chamada real ao fornecedor foi realizada. Veja [coleta e seleção](news-selection.md).

## Etapas 5 a 8

As integrações locais são a base para a coleta e geração de produção. Filas remotas, controle distribuído de consumo, streaming de notícias geradas, builds de aparelhos, beta e publicação continuam pendentes. Nenhum marco de produção foi marcado como concluído.
