# Áudio e publicação

A etapa 6 prepara o áudio no servidor e demonstra as medições com arquivos reais. Ainda não foi gerado um podcast com notícias e narração reais, nem executada a publicação em Supabase ou Trigger.dev.

## Como o arquivo é preparado

1. Conferir a aprovação da versão do roteiro e a validade das fontes antes da síntese.
2. Solicitar WAV ao Gemini 3.8 Flash TTS na faixa gratuita, com voz Kore. O arquivo final continua sendo MP3. Uma falha de rede não provoca repetição automática que possa cobrar duas vezes.
3. Guardar a síntese por versão do roteiro e identidade da voz, com checksum. Um arquivo incompleto ou alterado interrompe o reaproveitamento.
4. Medir codec, duração, volume e silêncio com FFprobe/FFmpeg.
5. Se a diferença permitir ajuste de ritmo de até 3%, normalizar e gerar o MP3 final. Fora dessa margem, solicitar nova redação e revisão, até três versões no total.
6. Conferir o arquivo final, as fontes e a integridade antes de publicar. O processamento não corta fala nem acrescenta silêncio para completar tempo.

Os registros privados incluem versão aprovada, tentativas, identidade da voz, medições e checksum. O aplicativo recebe somente os dados públicos e o acesso temporário ao áudio.

## Controles técnicos iniciais

| Controle | Regra atual |
| --- | --- |
| Duração final | 120 segundos, com tolerância de um segundo |
| Formato final | MP3, 44.100 Hz, até 10 MiB |
| Normalização | Alvo de −16 LUFS e pico de −1,5 dBTP |
| Aceite do volume final | Entre −18 e −14 LUFS, pico de até −1 dBTP |
| Silêncio | Reprovar pausa maior que 3 segundos ou silêncio acima de 15% |
| Detecção de silêncio | Abaixo de −45 dB por pelo menos 0,5 segundo |

Esses limites são provisórios e precisam ser calibrados com fala real. Medição técnica não comprova naturalidade, clareza, pronúncia ou fidelidade jornalística. A voz ainda precisa da avaliação de ouvintes prevista no roadmap.

## Publicação preparada

`publishEpisode` verifica o arquivo e o envia ao bucket privado. A função SQL `complete_generation` registra o episódio, as referências e os registros privados em uma transação. A combinação do trabalho e checksum permite repetir a confirmação sem duplicar a edição.

Uma falha de confirmação não apaga o objeto: o banco pode ter confirmado antes da perda de conexão. Na repetição, os bytes existentes precisam corresponder ao checksum. Limpeza de objetos sem episódio e reconciliação remota ainda precisam ser integradas à operação.

A migração foi testada em PostgreSQL embarcado; o adaptador de Storage, com transporte controlado. Nenhum banco remoto foi alterado. A tarefa Trigger.dev ainda encerra com `integration_pending`, e a geração de produção continua desativada.

## Apresentar sem fornecedores

Execute `npm run dev:api` e `npm run web`. Abra Preferências → Apresentação do projeto → Conferir o áudio de dois minutos.

- A amostra aprovada é um sinal de 440 Hz, sem voz ou notícias, medido em 120,01 segundos na auditoria desta entrega.
- Os outros cenários usam arquivos reais com silêncio e duração fora da margem e mostram os bloqueios.
- Preparar não inicia a reprodução. O volume inicial da amostra é reduzido; a pessoa toca em reproduzir para ouvir.
- A mídia usa um endereço temporário de dez minutos. Preparar novamente renova o acesso.

Pelo terminal, `npm run audit:audio` grava relatórios e o arquivo técnico em `work/audio-audit`, ignorado pelo Git. Nenhuma credencial ou chamada paga é necessária. O player comum do protótipo mantém a amostra de 12 segundos.

## Referências

- [ElevenLabs: conversão de texto em voz](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [FFmpeg: filtros de áudio](https://ffmpeg.org/ffmpeg-filters.html)
- [Expo Audio no SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/)
