/**
 * Uplatnění poukazu jde vrátit (undo) jen do 1 hodiny od uplatnění.
 * Po této době se zamkne a vrátit ho může jen vlastník.
 * Bez časové značky (starší záznamy) se bere jako zamčené.
 */
export const REDEMPTION_UNDO_LOCK_MS = 60 * 60 * 1000;

export function isRedemptionUndoLocked(
  redeemedAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!redeemedAt) return true;
  const time = new Date(redeemedAt).getTime();
  if (Number.isNaN(time)) return true;
  return now.getTime() - time >= REDEMPTION_UNDO_LOCK_MS;
}
