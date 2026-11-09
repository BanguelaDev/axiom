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
4. Para o celular, usar `npm run dev:lan`, depois `npm run phone:qr`, e escanear o QR com Expo Go compatível com SDK 58. Mantenha celular e computador na mesma rede. Veja o [guia Android](docs/android-expo-go.md).

## Mostrar ao professor

1. Apresentar os seis temas e escolher um assunto com notícias disponíveis.
2. Solicitar o podcast e explicar a sequência: notícias → fatos → roteiro → revisão → voz.
3. Reproduzir, pausar e usar os controles de 15 segundos.
4. Abrir as fontes e mostrar a data e o link de uma matéria.
5. Voltar ao histórico e retomar a escuta. Mostrar as opções claro e escuro.

A primeira preparação pode levar alguns minutos. Preparar a edição antes da apresentação reduz a espera; o servidor reaproveita o episódio enquanto ele permanece válido.

## O que conferir antes da entrega

Ouvir o episódio e conferir as fontes. Manter o computador e o terminal ligados. Verificar a conexão do celular e a disponibilidade da cota gratuita. Em Preferências → Apresentação do projeto há cenários técnicos identificados, que continuam acessíveis sem a chave.

Abertura, reprodução e barra foram confirmadas no Galaxy Note 20 Ultra pelo Expo Go. O responsável escolheu concluir diretamente no Expo Go e deu 5/5 para clareza e naturalidade da voz. Controles de tela bloqueada e segundo plano exigem um binário próprio e não integram esta entrega. Os demais resultados estão em [validação](docs/validation.md).

Na última conferência, a cota gratuita de voz estava esgotada. A demonstração de 12 segundos permite apresentar os controles; ela é identificada e não contém notícias. Uma nova geração jornalística depende da renovação da cota e de fontes recentes suficientes. Lojas e hospedagem remota são evoluções opcionais.
