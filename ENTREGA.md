# Apresentação do AXIOM

**AEMS — TADS, 6º período — Três Lagoas**

**Disciplina:** Programação para Dispositivos Móveis

**Professor:** Bruno

**Participantes:** José Guilherme Oliveira Martins, Cristian Cesar de Lima Filho e Fabio Herique Massucatto Sousa.

## Nossa proposta

O AXIOM transforma notícias das últimas 72 horas em um podcast de dois minutos. A pessoa escolhe um dos seis temas, acompanha a preparação e ouve o episódio. As fontes ficam disponíveis; o roteiro é interno.

Temas: Guerra da Ucrânia, Inteligência Artificial, Redes Sociais e Saúde Mental, Fraudes e Golpes, Política e Crimes.

## Tecnologias da entrega

React Native, Expo e TypeScript no aplicativo; Node.js no servidor local; feeds RSS para notícias; Gemini Free Tier para roteiro e voz; FFmpeg/FFprobe para conferir e preparar o áudio. GitHub registra as etapas e executa os testes.

A apresentação usa a faixa gratuita, sem hospedar um servidor pago. A chave Gemini precisa pertencer a um projeto sem faturamento. O app informa quando falta cota ou notícia suficiente.

## Preparar

1. Instalar Node.js 22.14 ou superior e executar `npm ci` na raiz.
2. Preencher `GEMINI_API_KEY` no `.env`, seguindo [o guia gratuito](docs/configurar-chaves.md).
3. Executar `npm run dev` e abrir http://localhost:8081.
4. Para o celular, usar `npm run dev:lan` com Expo Go compatível com SDK 58. O [candidato APK](docs/android-apk.md) usa `npm run server:lan`, sem Expo Go. Em ambos, mantenha celular e computador na mesma rede.

## Mostrar ao professor

1. Apresentar os seis temas e escolher um assunto com notícias disponíveis.
2. Solicitar o podcast e explicar a sequência: notícias → fatos → roteiro → revisão → voz.
3. Reproduzir, pausar e usar os controles de 15 segundos.
4. Abrir as fontes e mostrar a data e o link de uma matéria.
5. Voltar ao histórico e retomar a escuta. Mostrar as opções claro e escuro.

A primeira preparação pode levar alguns minutos. Preparar a edição antes da apresentação reduz a espera; o servidor reaproveita o episódio enquanto ele permanece válido.

## O que conferir antes da entrega

Ouvir o episódio e conferir as fontes. Manter o computador e o terminal ligados. Verificar a conexão do celular e a disponibilidade da cota gratuita. Em Preferências → Apresentação do projeto há cenários técnicos identificados, que continuam acessíveis sem a chave.

Abertura, reprodução e barra foram confirmadas no Galaxy Note 20 Ultra pelo Expo Go. Há um candidato APK 0.12.0 compilado, com checksum conferido. Seu aceite nativo e a avaliação humana de voz/conteúdo são registrados separadamente em [docs/validation.md](docs/validation.md). Lojas e hospedagem remota são evoluções opcionais.
