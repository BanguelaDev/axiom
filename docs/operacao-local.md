# Operação local do AXIOM

O computador é o servidor desta entrega. Não abra a porta 8787 na internet. A API usa sessões temporárias e limites, mas a rede Wi-Fi deve ser de confiança.

## Consultar relatos e métricas

Execute `npm run admin -- report` na raiz. O relatório local mostra relatos por episódio, médias de clareza/naturalidade, retiradas e os últimos 2.000 eventos. Registra pedidos novos, reuso, compartilhamento, tempo por fase, falhas, tentativas, caracteres enviados à voz e acessos ao áudio. Tokens são os informados pelo fornecedor; ausência de medição é `null`, nunca um zero inventado. Acesso ao áudio não comprova escuta concluída. As métricas não substituem a conferência das cotas e do faturamento no Google AI Studio.

O relatório não inclui o roteiro, as notícias completas ou tokens de sessão. Avaliações ainda são de uma amostra pequena e podem repetir pessoas com sessões novas; não representam uma pesquisa controlada.

## Relatar e retirar um episódio

No player, **Avaliar ou relatar problema** permite avaliar a voz ou sinalizar conteúdo, áudio e fontes. O relato é guardado no computador; não envia mensagem para terceiros nem retira a edição automaticamente. O responsável deve revisar os relatos durante o uso do projeto.

Para retirar uma edição, copie seu UUID da URL do player ou do relatório e execute:

```sh
npm run admin -- withdraw UUID-DO-EPISODIO
```

A retirada impede metadados, reuso, novas autorizações e novas leituras de links já emitidos. O player confere a disponibilidade antes de iniciar/retomar e a cada 30 segundos de reprodução enquanto o JavaScript está ativo. Um arquivo já recebido pelo aparelho não pode ser recolhido. Para corrigir, retire a versão antiga e solicite uma nova geração; não altere silenciosamente o áudio publicado.

O comando funciona com o servidor ligado. Não existe endpoint administrativo remoto. Preserve os arquivos privados para investigar o problema.

## Retenção e recuperação

| Dados | Prazo e comportamento |
| --- | --- |
| Sessões | Expiram em uma hora; tokens guardados como hashes no banco |
| Pedidos e associações | Até 24 horas na recuperação, com descarte de entradas antigas nas novas solicitações |
| Notícias, roteiros e áudios no computador | Após 7 dias, pastas UUID vão para quarentena; podem ser recuperadas por mais 7 dias antes da exclusão |
| Avaliações e relatos | 30 dias |
| Eventos e registros de retirada | 90 dias |
| Memória da primeira publicação | 180 dias desde a última observação; guarda hash da URL e data, sem corpo da notícia |
| Histórico no aparelho | Últimas 40 escutas; pode ser limpo em Preferências |

Primeiro simule a limpeza:

```sh
npm run admin -- retention
```

Para aplicar a política, use `npm run admin -- retention --apply`. A limpeza é manual: não depende de agendamento do Windows. Execute-a periodicamente. O comando só atua em pastas UUID diretas criadas pelo pipeline; ignora links e pastas com outros nomes. Não apaga `.env`, banco, código ou arquivos manuais. A quarentena fica em `work/retired-episodes`; para recuperar uma pasta antes da próxima limpeza, mova-a para uma pasta particular de revisão. Recuperar arquivos não cancela a retirada editorial.

As tabelas de sessão, relatos, eventos e memória de publicação também são limpas ao iniciar o servidor. Para backup, encerre o servidor e copie `work/data` e os diretórios de episódios. Não publique esse backup no GitHub.

## Limites da entrega

RSS não garante notícias suficientes em todos os temas a todo instante. O app mantém as 72 horas e informa falta de material. Gemini deve usar projeto Free Tier sem faturamento; cota esgotada interrompe o trabalho, sem fornecedor pago. A revisão por IA reduz erros, mas a aprovação editorial final depende de ouvir e conferir as fontes. Lojas, hospedagem remota e pesquisa de beta em escala ficam fora da entrega local escolhida.
