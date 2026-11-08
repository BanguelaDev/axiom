import { router } from 'expo-router';
import { Screen, Copy, Button, Notice } from '@/components/ui';
import { useApp } from '@/state/app-state';
import type { DemoScenario } from '@axiom/core/demo-generation';
export default function PrototypeScreen() {
  const { prepareDemo } = useApp();
  function run(scenario: DemoScenario) {
    prepareDemo('ai', scenario);
    router.push({ pathname: '/prepare/[id]', params: { id: 'ai' } });
  }
  return (
    <Screen>
      <Copy variant="eyebrow" tone="accent">
        APRESENTAÇÃO DO PROJETO
      </Copy>
      <Copy variant="title">Cada situação tem um caminho.</Copy>
      <Copy tone="secondary">
        Explore como o aplicativo deve responder quando uma preparação dá certo, quando faltam
        notícias e quando acontece uma falha.
      </Copy>
      <Notice>
        Estes são cenários simulados para revisar a experiência. A amostra tem 12 segundos, não
        contém notícias nem voz e não usa serviços externos.
      </Notice>
      <Button title="Testar preparação da amostra" onPress={() => run('ready')} />
      <Button title="Testar falta de notícias" secondary onPress={() => run('empty')} />
      <Button title="Testar falha e recuperação" secondary onPress={() => run('error')} />
      <Button title="Voltar aos temas" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}
