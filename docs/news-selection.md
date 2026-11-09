# Coleta e seleção de notícias

## O que foi implementado

A etapa 4 prepara uma pauta auditável antes de chamar a IA e a voz. O código usa consultas próprias em português e inglês para cada um dos seis temas, valida datas e conteúdo, remove cópias e seleciona até três acontecimentos, com três a seis matérias de suporte. Quando não encontra material e fontes independentes suficientes, bloqueia a pauta.

Os critérios foram testados com exemplos fictícios e respostas controladas do fornecedor. **Cobertura real, qualidade editorial, permissões de conteúdo e calibração com notícias reais continuam pendentes.** A geração de podcasts permanece desativada na API.

## Como a seleção funciona

1. A coleta envia duas consultas GNews, com até 25 resultados cada: no máximo 50 candidatos. Cada chamada tem timeout e pode ser repetida uma vez em falha temporária. Credenciais seguem em cabeçalho; URLs e corpos de erro do fornecedor não entram nos logs.
2. Datas precisam ter horário, fuso e calendário válido. Publicações futuras ou anteriores às 72 horas são rejeitadas. A mesma URL mantém a data mais antiga encontrada **naquela coleta**, mesmo quando reaparece com outra data.
3. Endereços são normalizados sem parâmetros de rastreamento. Conteúdo truncado, com menos de 500 caracteres ou excessivo é rejeitado. Um item incompatível não invalida os demais resultados.
4. Um filtro lexical aplica os recortes dos temas. Redes Sociais e Saúde Mental exige ambas as dimensões; Crimes exclui matérias identificadas como golpes. Política e Crimes exigem relação textual com o Brasil.
5. Somente domínios previamente revisados entram na seleção. O endereço da matéria e o domínio declarado pelo fornecedor precisam constar no mesmo cadastro de fonte.
6. Cópias são comparadas por URL e sequências de palavras. Relatos distintos com títulos semelhantes são agrupados como um acontecimento. A prioridade inicial combina atualidade e diversidade; os limiares ainda precisam de calibração editorial.
7. Matérias ligadas pelo mesmo grupo editorial ou pelo mesmo crédito explícito de agência não contam como confirmações separadas. São necessários ao menos dois grupos independentes e três matérias. O relatório registra as decisões, vínculos, fontes, datas e versão do algoritmo.

O filtro lexical e o agrupamento são heurísticos. Eles podem rejeitar textos pertinentes ou agrupar assuntos incorretamente. A identificação de agência reconhece apenas créditos textuais explícitos conhecidos; adaptações sem crédito podem passar despercebidas. Isso precisa ser complementado pela revisão por LLM já prevista e pela avaliação humana. Cadastro revisado não prova exatidão de toda matéria nem concede direitos de uso.

A proteção contra data renovada cobre as URLs observadas no lote. A comparação com publicações vistas em coletas anteriores dependerá do histórico persistente na integração remota. Antes e depois da síntese, a prova de viabilidade continua revalidando a janela das fontes utilizadas. Não há ampliação automática das 72 horas.

## Cadastro de fontes

Defina `NEWS_PUBLISHERS_FILE` no `.env` do servidor. O arquivo deve conter uma lista revisada pelo responsável:

```json
[
  {
    "domains": ["veiculo.example.invalid"],
    "editorialGroup": "grupo-editorial-de-exemplo",
    "reviewedAt": "2026-11-08T12:00:00Z"
  }
]
```

O domínio acima é fictício. Substitua por domínios reais somente após revisar a origem editorial, os domínios utilizados e as permissões de conteúdo. Subdomínios precisam ser cadastrados explicitamente. Não cadastre grupos do mesmo proprietário como independentes. Datas de revisão inválidas e domínios duplicados tornam o cadastro incompatível; revisões futuras não são aceitas na seleção. O arquivo de exemplo versionado começa vazio, para evitar uma lista de veículos aprovada sem avaliação.

`npm run validate:providers` confere a presença do cadastro sem consultar fornecedores. A prova `npm run poc -- ai` exige cadastro, credenciais e confirmação dos direitos antes de buscar conteúdo. A seleção é gravada em `work/episode-*/private/selection-report.json`; o relatório não inclui conteúdo completo ou roteiro. O app não recebe esse arquivo. A diversidade das fontes efetivamente usadas pelo roteiro é conferida novamente antes de gerar voz.

## Apresentar sem credenciais

```sh
npm run dev:api
npm run web
```

Abra Preferências → Apresentação do projeto → Entender a seleção de notícias. Escolha um dos seis temas e consulte o exemplo ou teste fontes insuficientes. A tela mostra critérios, datas e contagens de dados fictícios calculados no servidor. Não gera áudio. A rota autenticada `/dev/selection/:topicId` existe apenas no runner de desenvolvimento, sem acesso aos relatórios de notícias reais.

Para gerar os seis relatórios fictícios por terminal, execute `npm run audit:selection`. A saída fica em `work/selection-demo`, ignorada pelo Git.

## Validação

Testes cobrem os seis recortes, limites de data e fuso, datas impossíveis, URL com atualização, cópias, agrupamento, vínculos editoriais e agência, fonte não revisada, falta de conteúdo, quota, timeout/cancelamento e respostas incompatíveis. O contrato HTTP exige sessão e não disponibiliza a demonstração em staging/produção.

Não houve chamada real à GNews nesta entrega. Banco de auditoria remoto, retenção de conteúdo licenciado, independência editorial real e calibração de pesos ainda precisam da integração e revisão previstas no roadmap.

Referências utilizadas: [busca GNews](https://docs.gnews.io/endpoints/search-endpoint), [sintaxe das consultas](https://docs.gnews.io/query-syntax), [formato da resposta](https://docs.gnews.io/json-response), [erros e quotas](https://docs.gnews.io/error-handling).
