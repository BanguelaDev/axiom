# AXIOM no Android, com servidor no computador

Esta versão de teste funciona sem Expo Go e sem cabo USB. O computador continua responsável pelas notícias, pela IA e pelos áudios; o celular e o computador precisam usar a mesma rede Wi-Fi.

1. No computador, configure a chave gratuita no `.env` e execute `npm ci` e `npm run server:lan`. Se `npm run dev:lan` já estiver aberto, ele também fornece o servidor; não execute os dois ao mesmo tempo.
2. Instale `AXIOM-android-local.apk` no Android. É um pacote para avaliação acadêmica, com assinatura de teste, sem publicação em loja.
3. Abra o AXIOM. Na primeira abertura, informe o endereço exibido no terminal, como `http://192.168.1.10:8787`, e toque em **Conectar**.
4. Escolha um tema e aguarde a preparação. As chaves não devem ser informadas no celular.
5. Em Preferências → Alterar computador, atualize o endereço se o Wi-Fi ou o IP mudar.

O APK não depende do Metro nem de uma conta Expo. O servidor precisa permanecer ligado. A conexão HTTP é restrita pelo aplicativo a endereços privados; use somente sua rede de confiança e não encaminhe a porta do servidor para a internet.

## Conferência do pacote

O fluxo `APK Android local` gera o projeto nativo a partir dos plugins do Expo e compila com Gradle. Ele não recebe o `.env` nem chaves de IA. O resultado fica primeiro em um rascunho de release, com SHA-256 e identificação do commit. O executor padrão de repositório público é gratuito; o APK não usa armazenamento de artifacts do Actions. A permissão `workflow` foi concedida pelo responsável para publicar a automação.

Ainda é necessário instalar cada candidato no aparelho antes de aprová-lo. Conferir reprodução, pausa, barra, retomada, tela bloqueada, segundo plano e interrupções. Um build bem-sucedido não comprova esses comportamentos no celular.

Referências: [build local Expo](https://docs.expo.dev/guides/local-app-production/), [cobrança do Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [arquivos em releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
