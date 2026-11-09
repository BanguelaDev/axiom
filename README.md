# AXIOM

Notícias em áudio, em dois minutos.

O AXIOM é o nosso projeto para a disciplina de Programação para Dispositivos Móveis. A ideia é criar um aplicativo para Android e iOS que ajude as pessoas a acompanhar as notícias de forma rápida e fácil de ouvir.

O usuário escolhe um tema, e o aplicativo busca notícias publicadas nas últimas 72 horas. A partir delas, uma inteligência artificial prepara um roteiro interno, que é transformado em um podcast de dois minutos, com uma voz clara e natural. Os links das fontes ficam disponíveis para consulta.

## Sobre o trabalho

| Informação | Detalhe                                                    |
| ---------- | ---------------------------------------------------------- |
| Faculdade  | AEMS                                                       |
| Curso      | Tecnologia em Análise e Desenvolvimento de Sistemas (TADS) |
| Período    | 6º período                                                 |
| Cidade     | Três Lagoas                                                |
| Disciplina | Programação para Dispositivos Móveis                       |
| Professor  | Bruno                                                      |

### Participantes

- José Guilherme Oliveira Martins
- Cristian Cesar de Lima Filho
- Fabio Herique Massucatto Sousa

## Temas do aplicativo

- Guerra da Ucrânia
- Inteligência Artificial
- Redes Sociais e Saúde Mental
- Fraudes e Golpes
- Política
- Crimes

## Tecnologias previstas

| Parte do projeto                    | Tecnologias                                            |
| ----------------------------------- | ------------------------------------------------------ |
| Aplicativo mobile                   | React Native, Expo e TypeScript                        |
| Back-end, banco de dados e arquivos | Node.js local; Supabase opcional |
| Processamento em segundo plano      | Fila local Node.js; Trigger.dev opcional                                  |
| Busca de notícias                   | Feeds RSS públicos                                              |
| Criação do roteiro                  | Gemini Free Tier                                   |
| Geração da voz                      | Gemini TTS Free Tier                                             |
| Reprodução e tratamento de áudio    | expo-audio e FFmpeg/FFprobe                            |
| Versionamento e distribuição        | GitHub e Expo EAS                                      |

## Planejamento

Já é possível explorar os seis temas, o player e o histórico. O app também apresenta os critérios de seleção, revisão e áudio. No servidor, a preparação foi dividida em fatos, redação, revisão e tratamento do som, mantendo o roteiro interno. A integração com serviços reais e a validação da qualidade de conteúdo e voz continuam pendentes.

- [Roadmap resumido](AXIOM-roadmap-resumido.md): visão rápida da proposta, das tecnologias e das etapas.
- [Roadmap completo](AXIOM-roadmap.md): detalhes da arquitetura, da geração dos episódios e dos testes previstos.

## Como executar

Com Node.js 22.14 ou superior, na raiz do projeto:

```sh
npm ci
npm run dev
```

Crie uma chave Gemini em projeto Free Tier sem faturamento e preencha GEMINI_API_KEY no .env da raiz. Veja o [passo a passo gratuito](docs/configurar-chaves.md). Para testar no celular, use `npm run dev:lan` e o Expo Go compatível com o SDK 58, na mesma rede do computador.

A demonstração usa uma amostra sonora de 12 segundos, sem notícias ou narração. Em Preferências → Apresentação do projeto, a verificação de áudio também oferece um sinal técnico de dois minutos, com a API local em execução. O fluxo real usa RSS e a chave gratuita Gemini no servidor. Não há fallback para fornecedores pagos.

- [Guia de desenvolvimento](docs/development.md): configuração e testes.
- [Andamento das etapas](docs/progress.md): o que já foi feito e o que falta validar.
- [Experiência e identidade](docs/ux.md): decisões e caminhos do protótipo.
- [Base técnica](docs/backend.md): API local, banco, sessões e próximos passos da integração.
- [Coleta e seleção](docs/news-selection.md): janela de 72 horas, fontes e auditoria.
- [Roteiro e revisão](docs/editorial.md): evidências, verificações e limites da avaliação por IA.
- [Áudio e publicação](docs/audio.md): duração, volume, integridade e demonstração de dois minutos.
- [Registro das entregas](CHANGELOG.md): mudanças e testes de cada etapa.

A versão acadêmica roda com o computador ligado, sem hospedagem paga. O projeto Gemini precisa permanecer no plano Free, sem faturamento. Se faltar cota ou notícias suficientes, o app informa a indisponibilidade.
