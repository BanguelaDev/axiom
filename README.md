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
| Back-end, banco de dados e arquivos | Supabase Edge Functions, PostgreSQL e Supabase Storage |
| Processamento em segundo plano      | Trigger.dev e Node.js                                  |
| Busca de notícias                   | GNews API                                              |
| Criação do roteiro                  | OpenAI Responses API                                   |
| Geração da voz                      | ElevenLabs                                             |
| Reprodução e tratamento de áudio    | expo-audio e FFmpeg/FFprobe                            |
| Versionamento e distribuição        | GitHub e Expo EAS                                      |

## Planejamento

O desenvolvimento está na etapa de experiência e identidade. Já é possível escolher um tema, acompanhar uma preparação simulada, explorar o player e continuar pelo mini player ou pelo histórico. Há também cenários de falha e falta de notícias para apresentação do trabalho. A geração real ainda depende da configuração das contas e da validação de conteúdo e narração.

- [Roadmap resumido](AXIOM-roadmap-resumido.md): visão rápida da proposta, das tecnologias e das etapas.
- [Roadmap completo](AXIOM-roadmap.md): detalhes da arquitetura, da geração dos episódios e dos testes previstos.

## Como executar

Com Node.js 22.14 ou superior, na raiz do projeto:

```sh
npm ci
npm start
```

Use o Expo Go compatível com o SDK 58 para abrir no celular. Para uma prévia no navegador, execute `npm run web`.

A demonstração usa uma amostra sonora de 12 segundos, sem notícias ou narração. Os podcasts reais de dois minutos serão validados na próxima integração.

- [Guia de desenvolvimento](docs/development.md): configuração e testes.
- [Andamento das etapas](docs/progress.md): o que já foi feito e o que falta validar.
- [Experiência e identidade](docs/ux.md): decisões e caminhos do protótipo.
- [Registro das entregas](CHANGELOG.md): mudanças e testes de cada etapa.
