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

## Etapa 3 — Base técnica: iniciada

Criados os workspaces, TypeScript, verificações automáticas e uma proposta de migração SQL com RLS e roteiros privados. A migração ainda não foi aplicada. O app não está conectado a Supabase ou Trigger.dev.

## Etapas 4 a 8

As integrações locais são a base para a coleta e geração de produção. Filas remotas, controle distribuído de consumo, streaming de notícias geradas, builds de aparelhos, beta e publicação continuam pendentes. Nenhum marco de produção foi marcado como concluído.
