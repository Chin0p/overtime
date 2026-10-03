export function round(value: number, mode: 'floor' | 'round' = 'round'): number {
  return mode === 'round' ? Math.round(value) : Math.floor(value);
}
