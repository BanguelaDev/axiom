# Base técnica e API

## O que funciona nesta etapa

O app verifica uma sessão e consulta o catálogo por HTTP. No desenvolvimento web, usa uma API local descartável. Para Supabase, estão preparados o cliente de Auth anônimo, a Edge Function, as migrações, o acesso temporário ao áudio e o contrato da fila Trigger.dev.

A geração permanece **desativada no código da Edge Function**. A tarefa `axiom-generation` é uma reserva de integração: se invocada, encerra o trabalho como `integration_pending`. Ela não chama notícias, LLM ou voz. Habilitar a geração exige substituir essa tarefa pela orquestração validada nas etapas seguintes.

## Executar a conexão local

Na raiz, mantenha dois terminais:

```sh
npm run dev:api
```

```sh
npm run web
```

Abra Preferências → Apresentação do projeto → Verificar integração com o servidor. O teste consulta a saúde da API e os seis temas, sem solicitar áudio. O runner escuta somente `127.0.0.1:8787`, aceita a prévia em `localhost:8081` e mantém sessões opacas por uma hora, apenas em memória. Reiniciar descarta as sessões. Esse modo só é selecionado em desenvolvimento; não é um servidor para publicação nem atende um celular na rede.

## Contrato v1

| Rota                      | Resposta                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| `GET /health`             | Versão, ambiente e disponibilidade da geração                                    |
| `GET /topics`             | Os seis temas públicos; exige sessão                                             |
| `POST /generations`       | Recebe `topicId`; atualmente retorna 503, geração não configurada                |
| `GET /generations/:id`    | Estado de um trabalho associado à sessão                                         |
| `GET /episodes/:id`       | Metadados e referências de episódio pronto e válido                              |
| `GET /episodes/:id/audio` | URL assinada, com validade de até 5 minutos, limitada pela expiração do episódio |

No Supabase, o prefixo é `/functions/v1/axiom`. O runner local acrescenta `POST /dev/session`; essa rota não existe na Edge Function. Respostas são privadas (`no-store`), erros não incluem exceções dos fornecedores e origens web devem constar em `ALLOWED_ORIGINS`.

Na etapa 4, o runner também oferece uma [apresentação da seleção](news-selection.md) em `/dev/selection/:topicId`, com sessão e dados fictícios. Essa rota não está disponível na API de staging/produção nem permite consultar relatórios de notícias reais.

A etapa 5 acrescenta `/dev/editorial/:topicId`, também restrita ao desenvolvimento e à sessão. Ela exercita cenários fictícios de revisão e devolve somente estados e contagens. Fatos, citações, identificação da versão e roteiro ficam fora dessa resposta. Veja [roteiro e revisão](editorial.md).

## Banco e acesso

A etapa 6 acrescenta a migração `202611080002_complete_generation.sql` e o adaptador `publishEpisode`. O arquivo é enviado ao bucket privado antes da transação; `complete_generation`, restrita a `service_role`, confere trabalho, metadados, fontes, duração e presença do objeto e grava episódio, referências, roteiro e qualidade juntos. A repetição só retorna o mesmo episódio válido com o mesmo checksum. O servidor confere os bytes antes da publicação; a função SQL não analisa o áudio nem substitui a revisão editorial.

Se a confirmação falhar, o objeto privado é preservado: a transação pode ter sido concluída. A nova tentativa confere o arquivo existente antes de repetir a confirmação. Limpeza de objetos órfãos e integração com a fila continuam pendentes. Veja [áudio e publicação](audio.md).

Somente no runner local, `GET /dev/audio` exige sessão e prepara o sinal técnico. O resultado pronto fornece um endereço opaco de mídia com validade de dez minutos, leitura parcial e suporte a HEAD. O endereço permite acesso temporário ao sinal, sem expor roteiro ou caminho local. Essas rotas não existem em staging/produção.

- Roteiros ficam no schema `private`; o app não tem leitura ou escrita.
- O bucket `episodes` é privado, sem política de acesso direto ao cliente.
- Episódios, fontes e trabalhos são lidos pelo servidor e projetados em campos públicos. O cliente não lê as tabelas operacionais diretamente.
- `generation_requests` associa várias sessões ao mesmo trabalho. A política RLS mostra apenas a associação da própria sessão.
- A função `request_generation` só pode ser executada por `service_role`, após a API validar o usuário. Um lock transacional cobre o reuso, a reserva e as quotas.
- Limites iniciais: 6 pedidos por minuto e 12 por hora por sessão, 2 trabalhos ativos e 30 reservas por hora no total. Um índice impede dois trabalhos ativos para o mesmo tema. Trabalhos abandonados expiram após 10 minutos quando consultados ou ao reservar outro pedido.
- O reuso exige episódio gerado há menos de uma hora e todas as fontes dentro de 72 horas. A chave idempotente do Trigger.dev é o ID do trabalho.

Esses limites são a base do controle de consumo. Proteção adicional contra criação abusiva de sessões, teto monetário e recuperação periódica sem tráfego ainda pertencem à integração de produção. Uma URL assinada já emitida pode continuar funcionando até expirar, mesmo após retirada do episódio; não prometer revogação instantânea.

## Configurar Supabase e Trigger.dev

Usar projetos separados para desenvolvimento/testes e produção. Nenhuma conta ou ambiente remoto foi criado nesta entrega.

1. Com Docker e Supabase CLI disponíveis, executar `supabase start` e `supabase db reset` em um ambiente local descartável. `db reset` apaga os dados locais; não usar contra um banco com dados que precisem ser preservados.
2. Validar as três migrações e as políticas no Supabase completo. Habilitar login anônimo e configurar a proteção contra abuso recomendada pelo serviço.
3. No app, copiar `apps/mobile/.env.example` para `.env` nessa pasta e preencher apenas URL e chave **publishable**. As variáveis `EXPO_PUBLIC_` entram no pacote do app.
4. Na Edge Function, configurar os secrets do servidor: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AXIOM_ENVIRONMENT` (`staging` ou `production`), `ALLOWED_ORIGINS` e, futuramente, `TRIGGER_SECRET_KEY`. O gateway usa `verify_jwt=false` porque a própria função valida o access token com `auth.getUser`; isso não torna as rotas de dados públicas.
5. Configurar `TRIGGER_PROJECT_REF` e os secrets do servidor no Trigger.dev. A configuração e a tarefa inicial estão versionadas; nenhuma tarefa foi implantada ou executada remotamente.
6. Depois de aprovar notícias, direitos de conteúdo e voz, integrar o pipeline e só então habilitar a geração. Validar autenticação, RLS, Storage, fila, quotas e falhas em staging antes de publicar.

## Evidências e limites

Os testes executam as migrações em PostgreSQL embarcado, com PGlite e contratos mínimos dos schemas Auth/Storage. Verificam permissões, RLS, associação de sessões, reserva, quotas, expiração e reuso. Os testes HTTP usam o mesmo handler da Edge Function. O adaptador de Storage usa respostas controladas do serviço para conferir a assinatura e sua validade. O Deno verifica o código da função.

Isso não valida Supabase Auth, Storage ou Trigger.dev reais, nem concorrência entre processos e comportamento do gateway. Docker e Supabase CLI não estavam disponíveis neste computador; esses aceites permanecem pendentes.

Referências: [Auth anônimo](https://supabase.com/docs/guides/auth/auth-anonymous), [Auth no React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [URLs assinadas](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [tarefas Trigger.dev](https://trigger.dev/docs/tasks/overview).

## Atualização 0.7 — RSS e Gemini Free Tier

A entrega acadêmica usa API e fila locais com sessões opacas, reuso por tema, limites por sessão/global e expiração. O pipeline é real quando GEMINI_API_KEY está configurada em projeto gratuito sem faturamento. Não usa chaves de GNews/OpenAI/ElevenLabs. `npm run dev` inicia API e Expo; `dev:lan` permite apresentação no celular da mesma rede. Estado da API é descartado ao reiniciar.

O worker remoto agora chama a mesma orquestração, reserva somente um trabalho queued, renova sua atividade e publica via complete_generation. A tarefa inteira não é repetida automaticamente, para evitar síntese duplicada. Diretórios temporários são removidos após a publicação. O build opcional prepara FFmpeg/FFprobe via extensão oficial. Essa integração foi preparada em código, sem implantação remota. AXIOM_GENERATION_ENABLED é false por padrão e só deve mudar após validar o ambiente.
