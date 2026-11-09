import { useRef, useState } from 'react';
import { Slider } from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  semantics,
  testID as nativeTestID,
} from '@expo/ui/jetpack-compose/modifiers';
import { audioProgress, secondsFromProgress } from '@axiom/core/playback';
import { ControlsHost } from './controls-host';
import type { AudioProgressProps } from './audio-progress.types';
import { useApp } from '@/state/app-state';

export function AudioProgress({
  position,
  duration,
  disabled,
  onSeek,
  testID,
}: AudioProgressProps) {
  const { colors } = useApp();
  const progress = audioProgress(position, duration);
  const [drag, setDrag] = useState<number | null>(null);
  const pending = useRef<number | null>(null);
  return (
    <ControlsHost>
      <Slider
        value={drag ?? progress.fraction}
        min={0}
        max={1}
        steps={0}
        enabled={!disabled && progress.duration > 0}
        colors={{
          thumbColor: colors.accent,
          activeTrackColor: colors.accent,
          inactiveTrackColor: colors.line,
        }}
        modifiers={[
          fillMaxWidth(),
          semantics({ contentDescription: 'Progresso do áudio' }),
          ...(testID ? [nativeTestID(testID)] : []),
        ]}
        onValueChange={(value) => {
          pending.current = value;
          setDrag(value);
        }}
        onValueChangeFinished={() => {
          const value = pending.current;
          pending.current = null;
          if (value === null) return;
          // Buscar só ao soltar o controle evita disputar a posição com as atualizações do player.
          void Promise.resolve(onSeek(secondsFromProgress(value, progress.duration))).finally(() =>
            setDrag(null),
          );
        }}
      />
    </ControlsHost>
  );
}
