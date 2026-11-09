# Dados e funcionamento

O AXIOM é um projeto acadêmico da AEMS. Na execução local, não exige cadastro do ouvinte.

- Preferências e histórico ficam no aparelho. A opção Limpar histórico remove as entradas de escuta desse aparelho.
- Uma sessão temporária permite consultar a preparação. Seu identificador é guardado separadamente para retomar o pedido após recarregar o app.
- O computador que executa o servidor guarda os arquivos de áudio e os registros internos em `work/`, fora do Git. O roteiro não é enviado ao aplicativo.
- O material jornalístico selecionado e o roteiro são enviados ao Gemini para redação, revisão e voz. No Free Tier, o Google informa que pode usar esse conteúdo para melhoria de produtos. Não são enviados histórico ou dados pessoais dos ouvintes nessas chamadas.
- As referências apontam para sites externos, que têm suas próprias regras de acesso.
- Sessões, pedidos, cotas e registros privados ficam no SQLite em `work/data`, fora do Git. O banco guarda hashes dos tokens, sem a chave Gemini. Preparações interrompidas são identificadas após reiniciar.
- Notas de voz e relatos de problema são opcionais, vinculados ao episódio e a um hash da sessão. Não pedimos nome, e-mail ou texto livre. Ficam no computador por 30 dias, disponíveis ao responsável pelo projeto.
- A operação registra tempos, contagens, tokens informados pelo fornecedor e acesso ao áudio, sem conteúdo das notícias nesses eventos. O relatório local não é enviado a serviços de analytics.
- A [política de operação e retenção](operacao-local.md) define limpeza dos arquivos, quarentena de recuperação e retirada editorial. O histórico no aparelho pode ser limpo em Preferências.

Esta descrição corresponde à versão acadêmica local. Um serviço público precisa definir operação, retenção, suporte e termos próprios antes de ser disponibilizado.
