import type { Driver } from "../types";

/** Per-slot prediction match status once a result is known. */
export type MatchStatus = "exact" | "close" | "miss" | null;

/**
 * Driver-based ±1 proximity status, matching the 3/1/0 scoring in lib/scoring.ts.
 * Builds a Map<driverNumber, position> from the ordered result array (positions
 * 0..count-1) plus an optional boundary driver at index `count`, then returns the
 * status for the predicted driver at slot `slotIndex`:
 *   exact → same position; close → off by ±1; miss → otherwise.
 */
export function proximityStatus(
  predicted: Driver | null,
  resultDrivers: Driver[],
  boundaryDriver: Driver | null,
  count: number,
  slotIndex: number
): MatchStatus {
  if (!predicted) return null;
  const driverToPos = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const d = resultDrivers[i];
    if (d && !driverToPos.has(d.driverNumber)) driverToPos.set(d.driverNumber, i);
  }
  if (boundaryDriver && !driverToPos.has(boundaryDriver.driverNumber)) {
    driverToPos.set(boundaryDriver.driverNumber, count);
  }
  if (!driverToPos.has(predicted.driverNumber)) return "miss";
  const delta = Math.abs(driverToPos.get(predicted.driverNumber)! - slotIndex);
  if (delta === 0) return "exact";
  if (delta === 1) return "close";
  return "miss";
}
