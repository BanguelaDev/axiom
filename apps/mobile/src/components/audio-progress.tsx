import { Slider } from '@expo/ui';
import { audioProgress, secondsFromProgress } from '@axiom/core/playback';
import { ControlsHost } from './controls-host';
import type { AudioProgressProps } from './audio-progress.types';

export function AudioProgress({
  position,
  duration,
  disabled,
  onSeek,
  testID,
}: AudioProgressProps) {
  const progress = audioProgress(position, duration);
  return (
    <ControlsHost>
      <Slider
        value={progress.fraction}
        min={0}
        max={1}
        disabled={disabled || !progress.duration}
        onValueChange={(value) => void onSeek(secondsFromProgress(value, progress.duration))}
        testID={testID}
      />
    </ControlsHost>
  );
}
