"use client";

import { useEffect } from "react";

/**
 * Když je widget vložený v iframe, pošle nadřazené stránce skutečnou výšku obsahu.
 * Rodič podle ní nastaví výšku iframe (bez pevného min-height, takže nevzniká prázdné bílé místo).
 * Mimo iframe nic nedělá.
 */
export function EmbedHeightReporter() {
  useEffect(() => {
    if (window.self === window.top) return;

    let lastHeight = -1;
    const send = () => {
      const height = Math.ceil(document.body.scrollHeight);
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage(
        { type: "lss-embed-height", height },
        "*",
      );
    };

    send();
    const observer = new ResizeObserver(send);
    observer.observe(document.body);
    window.addEventListener("load", send);
    window.addEventListener("resize", send);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", send);
      window.removeEventListener("resize", send);
    };
  }, []);

  return null;
}
