export function round(value: number, mode: 'floor' | 'round' = 'floor'): number {
  return mode === 'round' ? Math.round(value) : Math.floor(value);
}
