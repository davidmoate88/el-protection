// Assigned once, at creation, to a Device/DamageCurve's own `color` field —
// not recomputed positionally on render, so colors don't reshuffle for the
// remaining curves when one is deleted mid-comparison.
export const CURVE_PALETTE: string[] = [
  "#2f5d8a", // steel blue
  "#c96f2c", // amber
  "#3f8f5f", // green
  "#a33f6b", // magenta
  "#6b5ca5", // violet
  "#2f9e9e", // teal
  "#b3261e", // red
  "#8a7a2f", // olive
  "#4f6b8a", // slate
  "#8a4f2f", // rust
];

export function nextPaletteColor(usedCount: number): string {
  return CURVE_PALETTE[usedCount % CURVE_PALETTE.length];
}
