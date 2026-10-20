# Acompanhamento das etapas

## Etapa 1 — Notícias, IA e voz: em andamento

Implementados: catálogo dos seis temas; seleção na janela de 72 horas; deduplicação; exigência de veículos distintos; evidências literais por afirmação; revisão estruturada; integrações de GNews, OpenAI e ElevenLabs; medição e ajuste limitado de duração; saída pública sem roteiro.

Pendente: configurar as contas e permissões de conteúdo, executar chamadas reais, avaliar cobertura dos seis temas e aprovar a voz com ouvintes. Não foi gerado nenhum podcast jornalístico real até aqui.

## Etapa 2 — UX e identidade: protótipo inicial

Implementadas as telas de temas, player, fontes, histórico e preferências, com claro/escuro. O player usa uma amostra sonora original de 12 segundos identificada como teste. Histórico e preferências são locais.

Pendente: avaliação com usuários, acessibilidade em aparelhos físicos e aprovação do protótipo.

## Etapa 3 — Base técnica: iniciada

Criados os workspaces, TypeScript, verificações automáticas e uma proposta de migração SQL com RLS e roteiros privados. A migração ainda não foi aplicada. O app não está conectado a Supabase ou Trigger.dev.

## Etapas 4 a 8

As integrações locais são a base para a coleta e geração de produção. Filas remotas, controle distribuído de consumo, streaming de notícias geradas, builds de aparelhos, beta e publicação continuam pendentes. Nenhum marco de produção foi marcado como concluído.
