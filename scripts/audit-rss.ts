import { topics } from '../packages/core/src/topics.ts';
import { collectRss } from '../packages/pipeline/rss.ts';
const now = new Date();
for (const topic of topics) {
  const value = await collectRss(topic.id, now);
  console.log(
    JSON.stringify({
      tema: topic.name,
      estado: value.report.status,
      selecionadas: value.report.selected,
      origens: value.report.independentSources,
      feedsIndisponiveis: value.collection.unavailableFeeds,
    }),
  );
}
