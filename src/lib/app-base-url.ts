/**
 * Normalizuje NEXT_PUBLIC_APP_URL: odstraní koncové lomítko a doplní https://,
 * když hodnota protokol nemá (např. `longstoryshortwidget.vercel.app`).
 * Bez protokolu by vznikly relativní odkazy v e-mailech a špatné návratové URL platby.
 */
export function normalizeAppBaseUrl(raw: string | undefined | null): string | null {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
