# AXIOM no Android pelo Expo Go

Este é o modo escolhido para a entrega acadêmica: servidor no computador, celular na mesma rede Wi-Fi e nenhum cabo USB.

1. No computador, use Node.js 22.14 ou superior. Na raiz do projeto, execute `npm ci`.
2. Preencha `GEMINI_API_KEY` no `.env` da raiz seguindo o [guia gratuito](configurar-chaves.md). A chave fica no computador.
3. Execute `npm run dev:lan` e mantenha o terminal aberto. Esse comando inicia API e Expo.
4. Em outro terminal, execute `npm run phone:qr`. O comando confere a conexão e salva o QR em `work/android-preview/expo-go.png`.
5. No Android, abra o Expo Go compatível com SDK 58 e escaneie o QR. O comando também mostra um endereço `exp://` para digitar, caso necessário.

O responsável já confirmou abertura, reprodução e correção da barra no Galaxy Note 20 Ultra. A busca acontece ao soltar o controle. Se uma atualização não aparecer, recarregue o projeto pelo menu do Expo Go.

Para gerar notícias, escolha um tema e solicite o podcast. Cada nova edição depende de matérias suficientes das últimas 72 horas e da cota gratuita de texto e voz. Se faltar material ou cota, o app informa a indisponibilidade, sem usar serviços pagos. A demonstração identificada de 12 segundos permite testar a interface sem gerar notícias.

Mantenha o app em primeiro plano durante a escuta. O Expo Go não inclui o serviço de tela bloqueada configurado para o binário próprio; controles de mídia do sistema e reprodução em segundo plano não fazem parte deste aceite. O computador precisa ficar ligado, com API e Expo em execução.

Se a conexão falhar, confira o mesmo Wi-Fi, o terminal e o endereço mostrado por `phone:qr`. Se o IP do computador mudar, reinicie `dev:lan` e gere o QR novamente. Não publique sua chave nem o `.env`.
