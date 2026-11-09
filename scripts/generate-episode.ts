import { resolve } from 'node:path';
import { generatePodcast } from '../packages/pipeline/generate-podcast.ts';
const topic = process.argv[2] || 'ai';
const directory = resolve('work', 'episode-' + topic + '-' + Date.now());
generatePodcast(topic, directory, async (phase) => {
  console.log('Preparação: ' + phase);
})
  .then((rendered) => {
    console.log(
      'Amostra local concluída. Duração: ' +
        rendered.audio.metrics.duration.toFixed(2) +
        's. Requer revisão humana de conteúdo e voz.',
    );
  })
  .catch(() => {
    console.error(
      'Não foi possível gerar a amostra. Confira configuração, conteúdo disponível, quota e conexão. Detalhes privados não são exibidos.',
    );
    process.exitCode = 1;
  });
