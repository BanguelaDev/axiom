# Etapa 2 — Experiência e identidade

Referência: seções 3, 4 e 10 do [roadmap](../AXIOM-roadmap.md).

## Direção visual

Interface editorial, com poucos elementos e foco na escolha do tema e na escuta. A palavra AXIOM aparece com um sinal de áudio. A paleta do roadmap foi preservada, com cores por tema e variações de contraste para o modo claro. Fontes nativas, controles com áreas de toque de pelo menos 48 pontos e textos que podem se expandir.

Os valores compartilhados ficam em `apps/mobile/src/theme`. A cor nunca é a única forma de identificar um tema: nome e ícone aparecem juntos. Os controles nativos usam `@expo/ui` e o player usa `expo-audio`.

## Jornada do protótipo

1. Escolher um dos seis temas na aba Explorar.
2. Conhecer a proposta e tocar em Preparar demonstração.
3. Acompanhar os três passos simulados ou cancelar a preparação.
4. Abrir o player quando a amostra estiver pronta. A reprodução exige um toque da pessoa.
5. Pausar, ajustar o ponto de escuta e abrir Fontes.
6. Voltar às abas e usar o mini player ou o histórico para continuar.

A amostra sonora original tem 12 segundos, sem notícias e sem narração. Ela testa os controles; não substitui a validação do podcast de dois minutos. A preparação não chama APIs e é identificada como demonstração em todas as situações.

## Estados e recuperação

| Situação               | Resposta do protótipo                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Preparando             | Passo atual e opção de cancelar; timers antigos não concluem uma tentativa nova                  |
| Pronto                 | Acesso ao player, sem iniciar som automaticamente                                                |
| Falta de notícias      | Mantém a janela de 72 horas; permite escolher outro tema ou conhecer a amostra                   |
| Falha                  | Oferece nova tentativa e retorno aos temas                                                       |
| Áudio não carregado    | Controles desabilitados; após demora ou falha, mensagem e opção de recarregar                    |
| Histórico vazio        | Explicação curta com acesso aos temas                                                            |
| Tema desconhecido      | Mensagem e caminho para a tela inicial                                                           |
| Preferências inválidas | Entradas incompatíveis são descartadas; falha de leitura é informada e o app continua utilizável |

Para revisar os cenários, abrir **Preferências → Apresentação do projeto**. Os estados de falta de notícias e falha desse painel são simulados; não indicam incidentes reais.

## Continuidade da escuta

O progresso é salvo periodicamente, ao pausar, ao buscar um ponto e ao trocar de assunto. Uma escuta concluída reinicia do começo; uma escuta pausada retoma do ponto salvo. A gravação local é serializada para evitar que uma escrita antiga substitua preferências recentes. O histórico atual é da demonstração e fica no aparelho.

## Validação pendente

Ainda são necessários testes de usabilidade com participantes, ampliação de fonte, leitores de tela e áudio em Android/iPhone físicos. O teste automatizado de contraste cobre combinações de tokens; não atesta sozinho acessibilidade da interface inteira.
