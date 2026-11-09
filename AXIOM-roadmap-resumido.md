# AXIOM — Roadmap resumido

## Objetivo

Criar um aplicativo mobile para **Android e iOS** que gere podcasts de **2 minutos**, em português, com notícias publicadas nas **últimas 72 horas**. A proposta é ajudar o usuário a se informar rapidamente por meio de uma narração clara e natural.

## Temas disponíveis

- Guerra da Ucrânia
- Inteligência Artificial
- Redes Sociais e Saúde Mental
- Fraudes e Golpes
- Política
- Crimes

## Funcionamento

**Escolher um tema → Buscar notícias recentes → Criar roteiro com IA → Gerar voz → Ouvir o podcast.**

O roteiro será interno. O usuário terá um player com reprodução, pausa e navegação pelo áudio, além de acesso aos links das fontes utilizadas.

## Tecnologias previstas

| Área | Tecnologia |
| --- | --- |
| Aplicativo e interface | React Native, Expo e TypeScript |
| Back-end | Node.js e TypeScript; Supabase opcional |
| Banco de dados e arquivos de áudio | Arquivos locais; PostgreSQL e Supabase opcionais |
| Processamento em segundo plano | Fila local Node.js; Trigger.dev opcional |
| Busca de notícias | Feeds RSS públicos |
| Geração do roteiro | Gemini Free Tier |
| Síntese de voz | Gemini TTS Free Tier |
| Reprodução e tratamento de áudio | expo-audio e FFmpeg/FFprobe |
| Versionamento e distribuição | GitHub e Expo EAS |

## Etapas de desenvolvimento

1. **Planejamento e protótipo:** definir telas, identidade visual e testar as fontes de notícias e a voz.
2. **Base do aplicativo:** criar a interface com os seis temas e configurar o back-end e o banco de dados.
3. **Notícias e IA:** buscar notícias das últimas 72 horas, remover duplicatas e gerar um roteiro fiel às fontes.
4. **Áudio e player:** transformar o roteiro em voz, ajustar a duração para dois minutos e integrar a reprodução.
5. **Testes e entrega:** verificar conteúdo, clareza da narração e funcionamento em Android e iOS; preparar a primeira versão.

**Visual proposto:** interface simples, com modos claro e escuro e uma cor de identificação para cada tema.

**Prazo inicial estimado:** 6 a 8 semanas, sujeito à validação das integrações e aos testes.

A entrega acadêmica usa a faixa gratuita do Gemini e servidor local, sem contratar serviços. Cotas esgotadas são informadas pelo app.
