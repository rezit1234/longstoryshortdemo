import type { MouseEvent } from "react";

/** Sets CSS vars so the hover blob expands from the cursor. */
export function setBlobOrigin(event: MouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  event.currentTarget.style.setProperty("--blob-x", `${x}%`);
  event.currentTarget.style.setProperty("--blob-y", `${y}%`);
}
