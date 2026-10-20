import { router } from 'expo-router';
import { Screen, Copy, Button } from '@/components/ui';
export default function NotFoundScreen() {
  return (
    <Screen>
      <Copy variant="title">Essa página não está aqui.</Copy>
      <Button title="Voltar ao AXIOM" onPress={() => router.replace('/')} />
    </Screen>
  );
}
