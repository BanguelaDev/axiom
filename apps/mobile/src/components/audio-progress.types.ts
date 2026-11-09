export interface AudioProgressProps {
  position: number;
  duration: number;
  disabled?: boolean;
  onSeek(seconds: number): void | Promise<void>;
  testID?: string;
}
