# Configurar o AXIOM sem gastar

O fluxo ativo usa feeds RSS públicos para notícias e Gemini Free Tier para roteiro e voz. GNews, OpenAI e ElevenLabs não são usados. Supabase e Trigger.dev são opcionais; a apresentação funciona com o servidor local.

## Uma única chave

1. Entre em https://aistudio.google.com/api-keys com sua conta Google.
2. Clique em Create API key / Criar chave de API. Crie um projeto chamado AXIOM, se solicitado.
3. Confira a coluna Plan: ela precisa indicar Free / Free Tier. Não clique em Set up billing, não vincule faturamento e não informe cartão. Alguns projetos podem exigir verificação de acesso ao plano gratuito.
4. Copie a chave e abra o arquivo `.env` na raiz `work/axiom-app`, ao lado do package.json principal.
5. Preencha e salve:

```dotenv
GEMINI_API_KEY=cole_a_chave_aqui
```

Não coloque essa chave no arquivo do app, no chat ou no GitHub. O arquivo `.env` está ignorado pelo Git. As chaves antigas podem permanecer nele; o fluxo atual não as utiliza.

## Executar

Na raiz do projeto:

```sh
npm run validate:providers
npm run dev
```

O primeiro comando verifica presença da chave e ferramentas, sem mostrar valores nem fazer chamadas à IA. O segundo abre o servidor local e o Expo. Na prévia, escolha um tema e toque em Gerar podcast de dois minutos.

Para a apresentação no celular, consulte o guia de entrega. O telefone precisa alcançar o computador pela mesma rede. A chave continua somente no servidor.

## Limites gratuitos

Os modelos configurados são Gemini 3.5 Flash Lite e Gemini 3.8 Flash Lite TTS, listados com faixa gratuita na documentação consultada. A disponibilidade e as cotas variam por conta e região. Use um projeto sem faturamento. Se a cota acabar, a preparação é interrompida com uma mensagem; não há fallback para fornecedor pago.

A coleta usa o texto publicado nos feeds, com links e crédito aos veículos. Mantém o limite de 72 horas e fontes distintas. Se não houver material suficiente, o tema fica indisponível; não é preenchido com notícias antigas. A revisão automatizada não substitui conferir as notícias e ouvir o resultado.

No plano gratuito, o Google informa que conteúdo pode ser usado para melhorar seus produtos. Aqui são enviados o material jornalístico selecionado e o roteiro, sem dados pessoais de ouvintes.

Fontes oficiais, conferidas em 8 de novembro de 2026:

- [Chaves](https://ai.google.dev/gemini-api/docs/api-key?hl=en)
- [Faixa gratuita e faturamento](https://ai.google.dev/gemini-api/docs/billing?authuser=1&hl=en)
- [Preços e modelos gratuitos](https://ai.google.dev/gemini-api/docs/pricing.md)
- [Síntese de voz](https://ai.google.dev/gemini-api/docs/speech-generation?hl=pt)
