"use client";
import { useEffect, useState } from "react";

/**
 * How many pixels the on-screen keyboard covers at the bottom of the page.
 * It is 0 when there is no keyboard, or when the page already shrinks to make room for it.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      // Ignore small gaps and pinch-zoom, which also change the visual viewport.
      setInset(vv.scale <= 1.01 && covered > 80 ? covered : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
