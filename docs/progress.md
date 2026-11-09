# Acompanhamento das etapas

**Escopo confirmado em 9 de novembro:** servidor no computador, sem hospedagem remota. Validação física disponível em Android sem cabo USB. Supabase/Trigger.dev e lojas ficam fora desta entrega local.

## Entrega acadêmica — versão 0.8

O fluxo ativo usa RSS público e Gemini Free Tier, com servidor local. A chave já foi configurada e texto e voz foram exercitados com notícias reais. A conferência final da jornada e o resultado do primeiro episódio completo ficam no registro da etapa 8 ao final desta página. Os relatos anteriores descrevem cada versão na data da entrega.

## Etapa 1 — Notícias, IA e voz: em andamento

Implementados: catálogo dos seis temas; seleção na janela de 72 horas; deduplicação; exigência de veículos distintos; evidências literais por afirmação; revisão estruturada; integrações de GNews, OpenAI e ElevenLabs; medição e ajuste limitado de duração; saída pública sem roteiro.

Pendente: configurar as contas e permissões de conteúdo, executar chamadas reais, avaliar cobertura dos seis temas e aprovar a voz com ouvintes. Na etapa 1 original, ainda não havia podcast jornalístico real; o primeiro fluxo completo está registrado na entrega 0.8.

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

## Etapa 3 — Base técnica: implementação local, integração remota pendente

Entrega de 8 de novembro de 2026, seguindo as seções 6, 9, 10 e 11 do roadmap:

- API compartilhada entre runner local e Edge Function, com validação de sessão, catálogo, contratos de pedidos e respostas sem roteiro.
- App com cliente Supabase Auth anônimo e tela de verificação em Preferências → Apresentação do projeto → Verificar integração com o servidor.
- Comunicação HTTP real com a API local descartável, incluindo falha de conexão e nova tentativa. Esse runner não emula Supabase inteiro.
- Migração adicional com associação entre sessões e trabalhos, quotas, reuso, expiração e reserva transacional de uma edição por tema.
- Bucket privado e adaptador de URLs assinadas com validade limitada; metadados operacionais restritos ao servidor.
- Configuração do Trigger.dev e tarefa inicial que encerra com `integration_pending`, sem fornecedores. A geração permanece desativada na Edge Function.
- 31 testes automatizados, verificação Deno da função e verificações mobile. Migrações executadas em PostgreSQL embarcado com contratos mínimos de Auth/Storage.

Pendente: aplicar e testar em Supabase completo, configurar projetos separados e credenciais, validar Auth e Storage reais, implantar a fila, conectar o pipeline e testar concorrência distribuída. Não há Docker/Supabase CLI disponíveis neste computador. A etapa ainda não cumpre o aceite remoto; nenhum banco remoto foi alterado. Veja [base técnica](backend.md).

## Etapa 4 — Coleta e seleção: implementação local, cobertura real pendente

Entrega de 8 de novembro de 2026, conforme as seções 7.1 a 7.3, 10 e 11 do roadmap:

- Consultas próprias em português e inglês para os seis temas, com até 50 candidatos, timeout, tentativa limitada e erros seguros do fornecedor.
- Datas com horário/fuso e calendário válido, janela de 72 horas e preservação da publicação mais antiga da mesma URL dentro do lote.
- Filtros de tema e conteúdo, deduplicação por endereço e texto, agrupamento heurístico de acontecimentos e pauta de três a seis matérias.
- Cadastro explícito de domínios e grupos editoriais revisados; vínculos de proprietário e créditos de agência identificados não contam como fontes independentes.
- Relatório de decisões integrado à prova de viabilidade e guardado em arquivo privado, sem expor conteúdo completo ou roteiro.
- Apresentação dos critérios no app e comando de auditoria dos seis temas, sempre com exemplos fictícios identificados.
- 50 testes automatizados, incluindo seleção, GNews com respostas controladas e acesso à demonstração por sessão.

Pendente: validar cobertura e direitos com o fornecedor, cadastrar fontes reais, calibrar filtros e agrupamentos com revisão editorial, complementar classificação por LLM e persistir auditoria/histórico no ambiente remoto. As demonstrações não equivalem a um conjunto de notícias reais aprovado. Nenhuma chamada real ao fornecedor foi realizada. Veja [coleta e seleção](news-selection.md).

## Etapa 5 — Roteiro e revisão: implementação local, qualidade factual real pendente

Entrega de 8 de novembro de 2026, conforme as seções 7.4, 7.5, 10 e 11 do roadmap:

- Extração de fatos com evidências literais, redação com vínculos e revisão por afirmação em chamadas separadas da Responses API.
- Respostas estruturadas, declaração explícita de material insuficiente e bloqueios de evidência inválida, número novo em dígitos, atribuição perdida e referências ausentes.
- Conferência do título, suporte semântico, nomes/datas/números, incerteza, pertinência, tom, contradições e independência na revisão por LLM.
- Aprovação ligada à versão do material e nova conferência das fontes antes da voz. Alterações e fontes vencidas interrompem o fluxo.
- Prova de viabilidade integrada aos registros privados de fatos/revisão; correções de duração reutilizam fatos, mas exigem nova revisão do texto.
- Apresentação de resultados no app e auditoria dos seis temas com exemplos fictícios, sem expor roteiro ou evidências internas.
- 67 testes automatizados, incluindo o SDK real com respostas HTTP controladas. Nenhuma chamada real à OpenAI, notícias ou voz.

Pendente: configurar e executar fornecedores reais, avaliar fidelidade e linguagem com notícias dos seis temas, medir tempo/custo, revisar casos sensíveis com pessoas e persistir os registros no ambiente remoto. Revisão por LLM e validação de citações não garantem ausência de erros. O aceite editorial real ainda não foi alcançado. Veja [roteiro e revisão](editorial.md).

## Etapa 6 — Áudio: implementação local, narração e publicação remotas pendentes

Entrega de 8 de novembro de 2026, conforme as seções 7.6, 7.7, 10 e 11 do roadmap:

- Adaptador ElevenLabs com formato definido, limites de resposta e erros seguros, sem repetir automaticamente uma chamada de voz cujo resultado possa ter sido cobrado.
- Orquestração com até três versões revisadas, reaproveitamento local da síntese por versão/voz e conferência de integridade antes de publicar.
- Medição real de codec, duração, volume e silêncio; normalização e ajuste de ritmo limitado a 3%, sem cortar fala nem preencher com silêncio.
- Adaptador de publicação em bucket privado e migração transacional para episódio, fontes, roteiro e relatório privado. Repetições conferem o checksum; falha de confirmação não apaga um objeto que pode já estar publicado.
- Tela de apresentação com amostra técnica de 120,01 segundos e cenários bloqueados. É um sinal sonoro, sem voz ou notícias; a amostra comum do protótipo continua tendo 12 segundos.
- 76 testes aprovados, incluindo FFmpeg real, transporte de voz controlado, Storage simulado e migrações em PostgreSQL embarcado. Auditoria local aprova a amostra e bloqueia silêncio e duração fora da margem.

Verificação na prévia: preparação sem reprodução automática, reprodução, pausa, progresso e bloqueios de silêncio/duração; tela revisada em 390 pixels. A aba permanece disponível para acompanhar o projeto.

Pendente: testar a narração real em português e com ouvintes, aplicar a migração em Supabase completo e conectar a orquestração e a publicação à tarefa Trigger.dev. A tarefa ainda encerra com `integration_pending`; a geração de produção continua desativada. Nenhum fornecedor foi consultado nem banco remoto alterado. Veja [áudio e publicação](audio.md).

## Etapas 7 e 8

As integrações locais são a base para a coleta e geração de produção. Filas remotas, controle distribuído de consumo, streaming de notícias geradas, builds de aparelhos, beta e publicação continuam pendentes. Nenhum marco de produção foi marcado como concluído.

## Etapa 7 — Jornada mobile e fluxo gratuito integrados

Entrega de 8 de novembro de 2026, seguindo a etapa 7 do roadmap e a decisão de custo zero:

- Escolha do tema conectada à API, consulta de fila, reuso e recuperação do identificador do trabalho após fechar/reabrir o app.
- Player de episódios com fonte HTTP temporária, controles de reprodução/pausa/busca, retomada, mini player e referências com links.
- Histórico de episódios separado das amostras, sem roteiro ou URL assinada. Sessão local preservada e renovação após rejeição do servidor.
- RSS público substitui GNews. Gemini Free Tier substitui OpenAI/ElevenLabs no fluxo ativo. Não há fallback para fornecedores pagos.
- Orquestração compartilhada entre prova de viabilidade, API/fila local e worker remoto opcional. Geração remota depende de implantação e opt-in; não foi ativada.
- Comandos `npm run dev` e `npm run dev:lan`; a segunda opção fornece ao celular um endereço de rede alcançável para API e áudio, mantendo os segredos no servidor.
- 88 testes aprovados, TypeScript/Deno, lint e exportação web. Coleta RSS real encontrou material em quatro dos seis temas na primeira auditoria; notícias insuficientes continuam bloqueadas.

Pendente nesta entrega: chave Gemini Free Tier do responsável, primeira síntese jornalística real, revisão humana e teste em celular físico. A prévia confirmou a nova navegação e o tratamento de geração não configurada. Supabase completo, fila remota, beta e lojas não foram validados. As etapas históricas acima registram os fornecedores utilizados naquela versão; a configuração ativa agora está em [configurar chaves](configurar-chaves.md).

## Etapa 8 — Preparação da apresentação acadêmica

- Dois episódios jornalísticos reais concluídos, em IA e Política, ambos medidos em 120,03 segundos. Player, controles, referências, mini player e histórico conferidos na prévia. Retomada após recarregar confirmada no episódio de Política, preservando o ponto salvo sem reprodução automática.
- 99 testes aprovados, TypeScript/Deno e lint sem erros. Revisão da tela em 390 × 844 pixels e captura da prévia.
- Guia [ENTREGA.md](../ENTREGA.md), informações sobre dados, ícone original e versões alinhadas em 0.8.0.
- Dependências corrigidas dentro do Expo SDK 58; Expo Doctor aprovado em 20 de 20 verificações. Auditoria npm reduzida para 12 ocorrências moderadas, sem altas ou críticas.
- Exportações web, Android e iOS aprovadas. Os bundles Android/iOS são JavaScript/Hermes, sem APK/IPA instalado.
- Extração Gemini com catálogo de trechos literais, descarte auditado de fatos com números sem evidência e créditos de atribuição antes da revisão.
- Seleção de parágrafos completos para o orçamento de palavras; nova redação calibrada pela duração e quantidade efetiva de palavras da versão narrada.
- Uma correção editorial por preparação, guiada pelo motivo de rejeição e submetida a nova revisão. Limite de três versões de áudio; cota e indisponibilidade não são repetidas automaticamente.
- Ritmo calibrado em até 10% para a narração gratuita, após variação observada na fala real. Mantidos o arquivo final de dois minutos, o texto completo e os controles de volume e silêncio; avaliação com ouvintes pendente.
- Renovação de sessão local rejeitada uma única vez, preservando o pedido. Falhas de servidor não provocam repetição automática da geração.
- Correção de nomes temporários extensos na conversão de áudio no Windows, com teste de regressão.
- Auditoria RSS dos seis temas: Ucrânia, IA, Fraudes e Política com material suficiente; Saúde Mental e Crimes insuficientes naquele instante. A janela de 72 horas é preservada.

Permanecem fora do aceite acadêmico local: avaliação humana em escala, teste em aparelhos físicos, segundo plano/Bluetooth, Supabase completo, Trigger.dev implantado, beta e lojas. A configuração ativa não usa GNews, OpenAI ou ElevenLabs e não tem fallback pago.

## Etapa 9 — Persistência e recuperação local

- SQLite privado para sessões, pedidos, associações, cotas e registros do áudio aprovado; tokens guardados como hashes.
- Recuperação após reiniciar sem zerar limites ou repetir chamadas à IA. Trabalhos interrompidos pedem nova tentativa; áudios válidos são reutilizados.
- Gravação atômica e detecção de alterações concorrentes. Banco incompatível não é apagado automaticamente.
- Removida uma possibilidade de corrida na reserva de pedidos concorrentes com cache expirado.
- 103 testes aprovados, incluindo reinício HTTP, isolamento, cota preservada e recuperação de áudio com FFmpeg real. TypeScript/Deno e lint aprovados.

Próximas pendências locais: cobertura das fontes, operação/retirada e retenção, pacote Android instalável e testes com o aparelho e ouvintes. As amostras reais anteriores não equivalem à avaliação dos seis temas.

## Etapa 10 — Fontes e correções no Android

- Lote distribuído entre grupos editoriais; primeira publicação preservada antes de limitar a coleta e calendário RFC/ISO estrito. Filtros evitam menções incidentais a crimes e golpes.
- Feed atual do g1 e PsyPost. Auditoria: cinco temas com material suficiente; Saúde Mental sem notícias elegíveis, mantendo 72 horas.
- QR local com API e manifesto conferidos. Abertura e reprodução confirmadas em Galaxy Note 20 Ultra.
- Corrigidos largura, proporção e arraste da barra. O responsável confirmou a correção e a ausência de novo aviso. No Expo Go, o serviço de tela bloqueada não é acionado.
- 108 testes, TypeScript/Deno, lint, exportações e Expo Doctor 20/20. Pela API, Ucrânia, IA e Crimes geraram áudio de 120,03 segundos; Fraudes foi bloqueado pela revisão de atribuição. Política já havia sido validado e foi reproduzido pelo responsável.

Pendente: APK próprio para validar serviço de reprodução, tela bloqueada e segundo plano; operação/retirada e retenção; revisão humana do conteúdo e da voz. A resposta de nota/versão do Android não permitiu registrar uma avaliação de 1 a 5 com segurança.

## Etapa 11 — APK e conexão no aparelho

- Tela de conexão ao computador, teste do catálogo/API antes de salvar e restauração do endereço no aparelho. Sessões por endereço; troca cancela pedidos e remonta o player.
- Build local habilitado explicitamente, sem chave ou IP pessoal. Serviço nativo de áudio configurado pelos plugins, com verificação do manifesto gerado. Módulo de tema do sistema instalado.
- `npm run server:lan` dispensa o Metro para uso com APK. [Guia Android](android-apk.md) com instalação, conexão e critérios de avaliação.
- 109 testes aprovados, TypeScript/Deno e lint limpos, Expo Doctor 20/20. Prévia conectou ao servidor real e recusou endereço público. CI da etapa 10 aprovada no commit 4abb09a.
- Workflow preparado localmente para compilar e guardar um candidato em rascunho de release, sem conta Expo ou artifacts pagos. O GitHub recusou o arquivo por falta do escopo OAuth `workflow`; autorização solicitada ao responsável. Compilação e instalação continuam pendentes.

Próximas pendências: concluir o candidato Android, operação/retirada e retenção, registrar avaliação humana e validar controles nativos no aparelho. O responsável confirmou que barra e reprodução no Expo Go agora funcionam.
