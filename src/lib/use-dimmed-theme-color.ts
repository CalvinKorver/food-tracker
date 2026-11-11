"use client";

import { useEffect } from "react";

/** Match modal dim under the iOS status bar (theme-color paints that strip). */
export function useDimmedThemeColor(active = true) {
  useEffect(() => {
    if (!active) return;
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    const prev = new Map<HTMLMetaElement, string | null>();
    metas.forEach((node) => {
      const el = node as HTMLMetaElement;
      prev.set(el, el.getAttribute("content"));
      el.setAttribute("content", "#000000");
    });
    return () => {
      prev.forEach((content, el) => {
        if (content == null) el.removeAttribute("content");
        else el.setAttribute("content", content);
      });
    };
  }, [active]);
}
