# Servidor local e API

O AXIOM usa Node.js, TypeScript e SQLite no computador. O aplicativo conversa com a API pela rede local. A decisão de 9 de novembro de 2026 mantém a hospedagem no computador; Supabase e Trigger.dev são alternativas futuras, fora desta entrega.

## Executar

`npm run dev` abre a API em `127.0.0.1:8787` e a prévia em `localhost:8081`. `npm run dev:lan` prepara o endereço da mesma rede Wi-Fi para o Android. O computador e o terminal precisam permanecer ligados.

A única chave do fluxo atual é `GEMINI_API_KEY`, no `.env` da raiz, em projeto Google Free Tier sem faturamento. A chave fica no servidor e não é enviada ao app.

## Persistência

- `work/data/axiom.sqlite` guarda sessões, trabalhos, associações, cotas e referências privadas do áudio aprovado.
- O token da sessão é guardado no banco como hash SHA-256. A sessão dura uma hora e sobrevive a um reinício nesse intervalo.
- Pedidos do mesmo tema compartilham o processamento. Áudios aprovados e ainda válidos podem ser reutilizados depois de reiniciar o servidor.
- Uma preparação interrompida fica identificada como falha recuperável. A recuperação não dispara chamadas à IA automaticamente.
- Os limites de uso não são zerados pelo reinício. As gravações são atômicas, e uma alteração concorrente não sobrescreve o estado silenciosamente.
- Banco incompatível ou danificado interrompe a inicialização. Não apagar `work/data` para tentar corrigir sem preservar uma cópia.
- A execução local usa uma instância de servidor por banco. O SQLite nativo exige Node.js 22.14 ou superior.

## Contrato HTTP

| Rota                      | Função                                     |
| ------------------------- | ------------------------------------------ |
| `GET /health`             | Versão e disponibilidade de geração        |
| `POST /dev/session`       | Criar sessão anônima local                 |
| `GET /topics`             | Catálogo dos seis temas                    |
| `POST /generations`       | Solicitar ou reutilizar uma preparação     |
| `GET /generations/:id`    | Consultar um pedido associado à sessão     |
| `GET /episodes/:id`       | Metadados e referências do episódio válido |
| `GET /episodes/:id/audio` | Acesso temporário à mídia conferida        |

As rotas de geração, pedidos e episódios exigem sessão. A API não entrega o roteiro, fatos internos, citações ou chaves. O arquivo de áudio é conferido pelo checksum e pelas regras de duração e atualidade antes de emitir novo acesso. A mídia admite leitura parcial para o player.

## Verificação

Os testes reiniciam um servidor HTTP real com o mesmo banco, recuperam sessão e pedido, verificam cotas e isolamento, e conferem que não há repetição automática de fornecedor. Um teste com FFmpeg real recupera um episódio aprovado e renova o acesso sem gerar outra voz.

As migrações e adaptadores remotos permanecem no repositório como opção de evolução. Eles não são requisitos para iniciar ou usar o AXIOM local.
