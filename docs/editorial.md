# Roteiro e revisão editorial

A versão 0.7 usa Gemini Free Tier com as mesmas operações de fatos, redação e revisão. As referências a OpenAI abaixo registram o adaptador anterior, mantido apenas para testes e sem uso no fluxo atual.

Na versão 0.8, o adaptador Gemini seleciona identificadores de trechos literais preparados pelo servidor, em vez de reescrever citações. Fatos com números ausentes nesses trechos são descartados e auditados; conteúdo insuficiente continua bloqueado. A redação recebe os créditos dos fatos vinculados e, quando excede o orçamento, pode selecionar parágrafos completos, preservando referências do título e diversidade. A revisão avalia essa versão final, antes da voz. A seleção automática e a revisão por IA ainda exigem conferência humana.

## O que foi implementado

A etapa 5 separa o trabalho em três fases no servidor: extração de fatos, redação e revisão. O roteiro continua interno. A prova de viabilidade só chama a voz depois das verificações de estrutura, evidência, fontes e revisão da versão atual.

A implementação foi testada localmente, com dados fictícios e respostas controladas. **Nenhuma chamada real à OpenAI foi realizada nesta entrega.** Isso valida o fluxo de bloqueio, não a capacidade do modelo de julgar notícias verdadeiras. O aceite da etapa exige avaliação editorial com os seis temas, fornecedores configurados e revisão humana.

## Fluxo no servidor

1. Conferir de três a seis matérias revisadas, origens independentes e validade nas últimas 72 horas. O contexto das matérias tem limite de 120 mil caracteres; conteúdos excessivos são rejeitados, sem corte silencioso.
2. Extrair de dois a doze fatos com IDs, trechos literais e identificação da matéria. Declarações e informações incertas precisam indicar a atribuição. O modelo pode retornar material insuficiente, sem inventar fatos para preencher a estrutura.
3. Validar citações com correspondência literal, desconsiderando apenas diferenças de espaço e normalização Unicode. Fonte desconhecida, trecho vazio ou citação inexistente interrompe o fluxo antes da redação.
4. Redigir o título e de duas a oito afirmações, cada uma ligada aos fatos que a sustentam. A evidência do roteiro é compilada pelo servidor a partir desses vínculos. Título sem referência e atribuição removida são bloqueados. O modelo pode recusar a redação por material insuficiente.
5. Conferir numerais: números escritos com dígitos precisam aparecer nos trechos vinculados. Essa verificação é conservadora; não interpreta números por extenso, conversões, nomes ou equivalências de datas. A fidelidade semântica continua dependendo da revisão.
6. Fazer outra chamada de IA para avaliar cada afirmação: suporte, nomes/números/datas, atribuição, incerteza, pertinência, tom e contradições. Título e independência das fontes também são avaliados. Omissões, duplicação de avaliações, qualquer item reprovado ou lista de problemas não vazia bloqueiam o roteiro.
7. Revalidar as fontes e a versão do material antes da voz. A aprovação fica ligada a uma identificação SHA-256 dos fatos, matérias, título e narração. Alterações exigem nova revisão. Essa identificação confere consistência interna; não é uma assinatura digital nem comprova verdade factual.

A revisão é uma chamada separada ao mesmo modelo, sem reaproveitar a conversa anterior. Não equivale a uma apuração independente por outro veículo ou pessoa. Citações literais, IDs corretos e respostas bem estruturadas também não provam que uma afirmação é verdadeira.

## Integração com OpenAI

O adaptador usa a Responses API, o SDK instalado e saídas estruturadas com Zod. Mantém `gpt-5.4-mini` como candidato do roadmap, configurável por `OPENAI_MODEL`, e envia `store: false`. Não oferece ferramentas ao modelo. Recusa, resposta incompleta, formato incompatível, saída de ferramenta inesperada e falha da API não liberam conteúdo.

Cada fase tem limite de 6.000 tokens de saída, timeout de 90 segundos e no máximo uma repetição de transporte pelo SDK. Tokens de entrada/saída informados na resposta ficam no registro privado. Isso não mede custos de tentativas sem resposta utilizável; orçamento e comportamento reais ainda precisam ser avaliados.

O app adiciona abertura e encerramento fixos. O texto completo deve ficar entre 170 e 360 palavras, com meta inicial de 260 palavras no corpo. Essa faixa evita conteúdo muito curto ou excessivo, mas não garante dois minutos: a duração ainda é medida no áudio real. Durante correções de duração, os fatos podem ser reutilizados; cada nova redação passa novamente pela revisão.

As matérias são enviadas como dados não confiáveis. Instruções nelas não recebem permissão para alterar o fluxo ou executar ferramentas. Os testes verificam essa separação no pedido e o bloqueio de saídas de ferramenta; não garantem imunidade a toda manipulação semântica de um modelo real.

## Arquivos privados e apresentação

Na prova `npm run poc -- ai`, após configurar os fornecedores e confirmar os direitos de conteúdo:

- `private/facts.json`: fatos, evidências e identificação do contexto.
- `private/editorial-N.json`: versão redigida, revisão, identificação, contagem de palavras e uso retornado pelo SDK. Em caso de bloqueio na redação/revisão, registra somente o código seguro da falha.
- `private/script.json`: roteiro final, preservando a organização anterior.
- `episode.json`: metadados e fontes públicas, sem fatos internos, citações de suporte ou texto de narração.

As pastas `work/` continuam ignoradas pelo Git. Roteiros não recebem endpoint de leitura no app. Persistência de fatos/revisões no ambiente remoto e retenção do conteúdo licenciado continuam pendentes.

Para apresentar os controles sem credenciais, execute `npm run dev:api` e `npm run web`, abra Preferências → Apresentação do projeto → Entender a revisão do roteiro. Há cenários de aprovação, evidência ausente e contradição, sempre identificados como fictícios. A resposta contém apenas resultado, contagens e estados das verificações. Não envia o roteiro, não usa IA real e não gera áudio.

`npm run audit:editorial` exercita os três cenários nos seis temas e salva relatórios sem roteiro em `work/editorial-demo`. A demonstração autenticada `/dev/editorial/:topicId` só existe no desenvolvimento.

## Validação e próximos passos

Os testes incluem o SDK real com transporte HTTP substituído por respostas controladas. Conferem os três schemas, modelo, limites, `store: false`, ausência de ferramentas, recusas, saídas incompletas e erros sem dados privados. Outros testes verificam evidências, números, atribuição, referências, revisão incompleta/de outra versão, alterações posteriores e expiração durante a revisão.

Ainda é necessário avaliar extração e fidelidade semântica com notícias reais, ajustar a redação em português, medir custo/tempo, validar casos de guerra, política, crimes e saúde mental e fazer a amostragem humana prevista no roadmap. A geração de produção permanece desativada.

Documentação oficial consultada: [saídas estruturadas na Responses API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [modelo GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
