import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getTopic } from '@axiom/core/topics';
import { Screen, Copy, Icon, Button, Notice } from '@/components/ui';
import { spacing } from '@/theme';
export default function SourcesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = getTopic(id || '');
  return (
    <Screen>
      <View style={{ gap: spacing.lg, paddingVertical: spacing.xl }}>
        <Icon name="text-box-search-outline" symbol="doc.text.magnifyingglass" size={48} />
        <Copy variant="title">As fontes vêm junto com a informação.</Copy>
        <Copy tone="secondary">
          Quando os episódios de {topic?.name || 'notícias'} forem gerados, esta tela mostrará os
          veículos, as datas e os links das matérias utilizadas.
        </Copy>
      </View>
      <Notice>
        A amostra do player não utiliza matérias jornalísticas. Não há fontes de notícias para
        exibir nesta demonstração.
      </Notice>
      <Button title="Voltar aos temas" onPress={() => router.replace('/')} />
    </Screen>
  );
}
