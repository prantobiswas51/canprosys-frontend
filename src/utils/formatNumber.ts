// Repeated float subtraction/multiplication (FIFO stock draws, cost
// roll-ups) can leave values like 3.3999999999999995 -- this rounds that
// away for display. Quantities default to 3 decimals (fine for kg/pieces),
// currency should still use toFixed(2) directly since that already rounds
// correctly on its own.
export function roundQty(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Rounds and drops trailing zeros (3.40 -> "3.4", 3 -> "3") -- for
// quantities, not currency.
export function formatQty(value: number | null | undefined, decimals = 3): string {
  if (value == null || Number.isNaN(value)) return '0';
  return roundQty(value, decimals).toString();
}
