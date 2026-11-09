# APK experimental opcional do AXIOM

**Fora da entrega atual:** o responsável escolheu usar diretamente o [Expo Go](android-expo-go.md). Este guia preserva o pacote experimental e seu processo de compilação; instalação e aceite físico do APK não são requisitos da entrega.

Esta versão de teste funciona sem Expo Go e sem cabo USB. O computador continua responsável pelas notícias, pela IA e pelos áudios; o celular e o computador precisam usar a mesma rede Wi-Fi.

[Baixar APK 0.12.1](https://github.com/BanguelaDev/axiom/releases/download/v0.12.1/AXIOM-android-local.apk) · [Arquivos da versão](https://github.com/BanguelaDev/axiom/releases/tag/v0.12.1)

1. No computador, configure a chave gratuita no `.env` e execute `npm ci` e `npm run server:lan`. Se `npm run dev:lan` já estiver aberto, ele também fornece o servidor; não execute os dois ao mesmo tempo.
2. Instale `AXIOM-android-local.apk` no Android. É um pacote para avaliação acadêmica, com assinatura de teste, sem publicação em loja.
3. Abra o AXIOM. Na primeira abertura, informe o endereço exibido no terminal, como `http://192.168.1.10:8787`, e toque em **Conectar**.
4. Escolha um tema e aguarde a preparação. As chaves não devem ser informadas no celular.
5. Em Preferências → Alterar computador, atualize o endereço se o Wi-Fi ou o IP mudar.

O APK não depende do Metro nem de uma conta Expo. O servidor precisa permanecer ligado. A conexão HTTP é restrita pelo aplicativo a endereços privados; use somente sua rede de confiança e não encaminhe a porta do servidor para a internet.

## Conferência do pacote

O fluxo `APK Android local` gera o projeto nativo a partir dos plugins do Expo e compila com Gradle. Ele não recebe o `.env` nem chaves de IA. O resultado fica primeiro em um rascunho de release, com SHA-256 e identificação do commit. O executor padrão de repositório público é gratuito; o APK não usa armazenamento de artifacts do Actions. A permissão `workflow` foi concedida pelo responsável para publicar a automação.

O APK 0.12.1 foi conferido com SHA-256 e aprovado na jornada automatizada do Android 14, inclusive com tela apagada. Ainda é necessário instalar o pacote no aparelho antes do aceite físico. Conferir reprodução, pausa, barra, retomada, tela bloqueada, segundo plano e interrupções. Um build bem-sucedido não comprova esses comportamentos no celular.

Referências: [build local Expo](https://docs.expo.dev/guides/local-app-production/), [cobrança do Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [arquivos em releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

Se a cota gratuita de voz estiver esgotada, use **Preparar demonstração** em um tema. A amostra identificada tem 12 segundos e permite testar controles, sem representar um podcast de notícias. Para segundo plano, existe também um sinal técnico de dois minutos em Preferências → Apresentação do projeto. Não é preciso cadastrar uma chave no celular.

O APK foi compilado a partir de `67208d57bc5dc433c499ccca8a7c4684302825a8`. O servidor atualizado, incluindo a remoção da abertura falada, está em `main` e no arquivo `AXIOM-0.12.1-codigo.zip` da release. Ao baixar o projeto completo, prefira esse arquivo; o arquivo automático “Source code” corresponde ao commit usado para compilar o APK.
