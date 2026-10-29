"use client";

import { useEffect } from "react";
import { startKaksha } from "@/lib/kaksha";

// The app UI is drawn by lib/kaksha.ts after the page loads in the browser.
// Next.js bundles that code into separate /_next/static files, so a saved copy
// of the page gets no working app.
export default function KakshaApp() {
  useEffect(() => {
    const root = document.getElementById("root");
    const toast = document.getElementById("toast");
    if (!root || !toast) return;
    return startKaksha(root, toast);
  }, []);

  return (
    <>
      <div id="root" />
      <div id="toast" className="toast" hidden />
    </>
  );
}
