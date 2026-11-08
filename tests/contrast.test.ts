import { test } from 'node:test';
import assert from 'node:assert/strict';
import { palettes, topicColors } from '../apps/mobile/src/theme/index.ts';
function luminance(color: string): number {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
for (const scheme of ['dark', 'light'] as const) {
  test(`textos e ações no tema ${scheme} têm contraste mínimo de 4,5:1`, () => {
    const palette = palettes[scheme];
    for (const foreground of ['text', 'secondary', 'muted', 'accent', 'notice'] as const) {
      for (const background of ['background', 'surface', 'elevated'] as const) {
        assert.ok(
          contrast(palette[foreground], palette[background]) >= 4.5,
          `${scheme}: ${foreground} em ${background}`,
        );
      }
    }
    assert.ok(contrast(palette.onAccent, palette.accent) >= 4.5);
    for (const [id, color] of Object.entries(topicColors[scheme])) {
      assert.ok(contrast(color, palette.surface) >= 4.5, `${scheme}: cor do tema ${id}`);
    }
  });
}
