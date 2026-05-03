const BRT_OFFSET_HOURS = -3;

export function nowMs(): number {
  return Date.now();
}

export function formatDateBrt(epochMs: number): string {
  const adjusted = new Date(epochMs + BRT_OFFSET_HOURS * 3600 * 1000);
  const yyyy = adjusted.getUTCFullYear();
  const mm = String(adjusted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(adjusted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isInNightWindow(epochMs: number, startHour: number, endHour: number): boolean {
  const adjusted = new Date(epochMs + BRT_OFFSET_HOURS * 3600 * 1000);
  const h = adjusted.getUTCHours();
  if (startHour > endHour) return h >= startHour || h < endHour;
  return h >= startHour && h < endHour;
}
