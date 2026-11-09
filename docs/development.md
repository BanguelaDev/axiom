# Desenvolver e apresentar o AXIOM

O projeto usa React Native, Expo SDK 58 e TypeScript. O fluxo ativo gratuito usa RSS público, Gemini Free Tier e FFmpeg. A chave de IA fica somente no servidor.

## Executar no computador

Requisitos: Node.js 22.14 ou superior e npm.

```sh
npm ci
```

Copie `.env.example` para `.env`, se ainda não existir, e configure `GEMINI_API_KEY` com uma chave de projeto Google AI Studio Free Tier sem faturamento. Siga [configurar chaves](configurar-chaves.md). Não sobrescreva um arquivo já preenchido.

```sh
npm run validate:providers
npm run dev
```

`dev` inicia a API na porta 8787 e o Expo na 8081. Abra http://localhost:8081. Não execute outro servidor nas mesmas portas. Escolha um tema e toque em Gerar podcast de dois minutos. A reprodução começa somente após tocar em ouvir.

O fluxo coleta notícias, extrai fatos, redige, revisa, gera voz e prepara o MP3 de 120 segundos com tolerância de um segundo. Cada correção do texto exige nova revisão, com até três versões de áudio. Cada preparação editorial admite uma correção orientada pelo motivo da rejeição. Cota gratuita esgotada e notícias insuficientes geram mensagens; não há fallback pago.

## Abrir no celular

Conecte o telefone e o computador à mesma rede e execute:

```sh
npm run dev:lan
```

Use o QR code do terminal no Expo Go compatível com SDK 58. O comando escolhe um IP privado do computador e fornece esse endereço ao app e à mídia. A chave permanece no servidor. Mantenha o terminal e o computador ligados. VPN, isolamento de Wi-Fi ou firewall podem impedir a conexão; a prévia web continua disponível.

Essa execução serve à apresentação acadêmica. Um APK independente, publicação em lojas e hospedagem contínua exigem builds e validações próprias. O áudio nativo em segundo plano e na tela bloqueada precisa de teste em Android/iPhone físicos.

## Demonstração sem chave

Sem `GEMINI_API_KEY`, a geração real fica desativada e o protótipo permanece navegável. Em Preferências → Apresentação do projeto há cenários de preparação, coleta e revisão, uma amostra original de 12 segundos e a verificação técnica de dois minutos. Os cenários são identificados; não são podcasts jornalísticos.

## Arquivos e privacidade

- `work/local-episodes`: MP3 final, metadados públicos e pasta `private` com seleção, fatos, revisão, roteiro e medições. Ignorado pelo Git.
- Sessões, fila, cotas e cache ficam em `work/data/axiom.sqlite`. Áudios aprovados válidos são recuperados após reiniciar; preparações interrompidas pedem uma nova tentativa, sem chamada automática ao fornecedor.
- O app guarda preferências, histórico e o identificador de uma preparação pendente. URLs de mídia temporárias e roteiros não entram no histórico.
- No modo local, a sessão temporária é guardada separadamente no aparelho para recuperar o pedido após recarregar. Ela é renovada quando o servidor a rejeita.
- Áudio e metadados são revalidados antes do acesso. Episódios expirados ou retirados podem continuar listados no histórico, mas não recebem novo acesso.

## Estrutura

| Pasta             | Conteúdo                                                      |
| ----------------- | ------------------------------------------------------------- |
| apps/mobile       | Telas, player, histórico, preferências e cliente HTTP         |
| packages/core     | Contratos públicos e regras compartilhadas                    |
| packages/pipeline | RSS, Gemini, revisão e áudio exclusivos do servidor           |
| packages/backend  | API, fila local e adaptadores remotos opcionais               |
| packages/tasks    | Worker Trigger.dev opcional; implantação não obrigatória      |
| supabase          | Migrações e Edge Function opcionais                           |
| tests             | Verificação de conteúdo, áudio, API, dados e contratos do app |

## Verificações

```sh
npm run typecheck
npm run lint
npm test
npm run export:web
```

`npm run audit:rss` confere a disponibilidade dos seis temas sem chamar a IA. Para verificar os bundles nativos, execute dentro de `apps/mobile`: `npx expo export --platform android` e `npx expo export --platform ios`. Essas exportações verificam JavaScript/Hermes e recursos; não geram APK ou IPA.

`typecheck` inclui Deno da Edge Function. O FFmpeg é fornecido por pacote; em ambientes que bloqueiam scripts npm, consulte `allowScripts` e execute `npm rebuild esbuild ffmpeg-static` quando necessário. Não é preciso liberar scripts de todos os pacotes.

Antes e depois de cada etapa, consulte `AXIOM-roadmap.md` e `docs/progress.md`. Registre mudanças e limites no CHANGELOG, crie commit explicativo e envie ao repositório, mantendo a prévia aberta.
