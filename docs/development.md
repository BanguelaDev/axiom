# Desenvolvimento do AXIOM

## Executar a demonstração

Requisitos: Node.js 22.14 ou superior e npm. Na raiz do repositório:

```sh
npm ci
npm start
```

Escaneie o QR code com o Expo Go compatível com o SDK 58. Para testar no navegador, use `npm run web`. O navegador é uma prévia da interface; a entrega principal continua sendo Android e iOS. Os testes de áudio em segundo plano e tela bloqueada precisam ser feitos em aparelhos físicos e em builds adequadas.

A versão inicial permite explorar os seis temas, testar reprodução, pausa e busca no áudio, consultar o estado vazio de fontes, salvar histórico local e escolher o tema visual. Ela usa um sinal sonoro original de 12 segundos para testar o player. Não contém narração nem notícias simuladas. A duração exibida corresponde ao arquivo real. O arquivo pode ser recriado com `npx tsx scripts/create-player-sample.ts`.

Na versão 0.2, a jornada começa no detalhe do tema e passa por uma preparação simulada antes do player. O mini player permite controlar a escuta nas abas. Para apresentar os estados pronto, sem notícias e falha com recuperação, abra Preferências → Apresentação do projeto. Esses passos didáticos não chamam fornecedores.

## Acompanhar ao vivo e registrar etapas

Durante as alterações de interface, mantenha `npm start` em execução e uma aba de `http://localhost:8081` aberta. O Fast Refresh mostra as edições de código. Se o computador ou o servidor for desligado, execute o comando novamente; a aba, sozinha, não mantém o servidor em execução.

Antes de cada etapa, leia `AXIOM-roadmap.md` e `docs/progress.md`. Ao entregar, atualize o acompanhamento e o `CHANGELOG.md`, execute as verificações e crie um commit com a etapa, mudanças, testes e pendências. Envie ao mesmo repositório sem reescrever o histórico. As instruções também estão no `AGENTS.md` da raiz.

## Testar a API local

Na versão 0.3, execute `npm run dev:api` em outro terminal e mantenha a prévia web na porta 8081. Abra Preferências → Apresentação do projeto → Verificar integração com o servidor. A API local cria uma sessão temporária e entrega o catálogo, sem notícias, voz ou cobrança. Leia [base técnica](backend.md) para o contrato, limitações e configuração futura de Supabase/Trigger.dev.

## Validar notícias, roteiro e voz reais

1. Copie `.env.example` para `.env` na raiz.
2. Configure as chaves de GNews, OpenAI, ElevenLabs e o identificador de uma voz licenciada em português brasileiro. Defina também `NEWS_PUBLISHERS_FILE` com os domínios e grupos editoriais revisados; veja [coleta e seleção](news-selection.md). Nunca use `EXPO_PUBLIC_` para essas chaves.
3. Confirme permissões para processar, resumir, narrar e reter o conteúdo. Ter uma assinatura de agregador não equivale a licença de todo conteúdo de terceiros.
4. Execute `npm run validate:providers`. Esse comando verifica a configuração local, sem revelar segredos e sem testar credenciais por chamadas externas.
5. Depois de confirmar os direitos, ajuste `CONTENT_RIGHTS_CONFIRMED=true` e execute `npm run poc -- ai` para gerar uma amostra. Isso consome as quotas dos fornecedores.

IDs: `ukraine`, `ai`, `mental-health`, `fraud`, `politics`, `crime`.

A prova de viabilidade busca notícias, filtra 72 horas, remove duplicatas, exige conteúdo suficiente e veículos distintos, cria roteiro estruturado com evidências literais, faz uma segunda revisão por LLM e gera voz. Há no máximo três versões de roteiro/voz para ajustar a duração. Ajustes de ritmo maiores que 3% são rejeitados. O arquivo final deve ter 120 segundos, com tolerância de um segundo. As datas são revalidadas antes e depois da síntese.

As amostras ficam em `work/episode-*`, ignorado pelo Git. `episode.json` contém apenas metadados e referências. O roteiro fica em `private/script.json`. A revisão automatizada e a diversidade de domínios não provam independência editorial nem eliminam erros: conferir conteúdo e ouvir a amostra antes de considerar a etapa 1 concluída.

A versão 0.4 também grava `private/selection-report.json`, com decisões e metadados da coleta. O pipeline exige fontes revisadas, confere vínculos editoriais/agências identificados e revalida a diversidade das fontes efetivamente usadas pelo roteiro. Para apresentar os critérios sem credenciais, use a nova opção em Apresentação do projeto ou execute `npm run audit:selection`; todos esses exemplos são fictícios.

Na versão 0.5, o pipeline extrai fatos uma vez e separa redação e revisão por afirmação. Cada nova redação para corrigir duração precisa de nova revisão. Os arquivos de fatos e revisão ficam em `private/`; não entram nas respostas do app. Veja [roteiro e revisão](editorial.md). A apresentação dos controles fica em Apresentação do projeto → Entender a revisão do roteiro, ou pelo comando `npm run audit:editorial`, sem IA real.

## Estrutura

| Pasta               | Conteúdo                                                                        |
| ------------------- | ------------------------------------------------------------------------------- |
| `apps/mobile`       | Aplicativo Expo com Expo Router e tema compartilhado                            |
| `packages/core`     | Catálogo e regras de seleção, validade e evidência                              |
| `packages/pipeline` | Integrações de notícias, LLM, voz e tratamento de áudio, exclusivas do servidor |
| `scripts`           | Verificação de configuração e prova de viabilidade                              |
| `packages/backend`  | Handler HTTP, runner local e adaptador de banco/Storage do servidor             |
| `packages/tasks`    | Contrato inicial da tarefa Trigger.dev; geração ainda desativada                |
| `tests`             | Testes editoriais, áudio, API, banco e proteção de dados                        |
| `supabase`          | Migrações, configuração local e Edge Function; sem aplicação remota             |

O app importa contratos e regras públicas de `@axiom/core`. Não importa os adaptadores do servidor nem seus segredos. Apenas URL e chave publishable do Supabase podem ser públicas; a chave service_role e as credenciais dos fornecedores são exclusivas do servidor.

## Verificações

```sh
npm run typecheck
npm run lint
npm test
npm run export:web
```

`typecheck` inclui a verificação da Edge Function com Deno 2.9.6, também executada pela automação existente do GitHub. Para executá-la separadamente, use `npm run typecheck:edge`. Na primeira execução, o npm baixa o runtime Deno fixado nessa versão.

O FFmpeg é uma dependência oficial de pacote para a prova de áudio. Em ambientes que bloqueiam scripts de instalação do npm, revise a configuração `allowScripts` e execute `npm rebuild esbuild ffmpeg-static` após autorizar esses dois pacotes. Não é necessário habilitar scripts de todos os pacotes.

## Próxima integração

Após a validação dos seis temas e da voz, substituir a tarefa inicial do Trigger.dev pela orquestração real e validar a base já implementada em Supabase completo. As migrações passaram em PostgreSQL embarcado com contratos mínimos; isso não substitui o teste de Auth/Storage, gateway, fila e concorrência distribuída. A geração segue desativada até essa integração.
