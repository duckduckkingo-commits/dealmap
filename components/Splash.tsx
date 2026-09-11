"use client";
import { useEffect, useState } from "react";

export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShow(false), reduced ? 400 : 2500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="splash" role="status" aria-label="Loading DEALMAP">
      <div className="splash-inner">
        <div className="splash-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <g transform="rotate(-18 32 32)">
              <path d="M22 14h16a4 4 0 0 1 4 4v16a4 4 0 0 1-1.2 2.8l-8 8a2.8 2.8 0 0 1-4 0l-8-8A4 4 0 0 1 19.6 34V18a4 4 0 0 1 4-4z" fill="#fff" />
              <circle cx="35.5" cy="20.5" r="2.2" fill="#2E6BF0" />
              <rect x="24" y="29" width="4" height="7" rx="1.4" fill="#2E6BF0" />
              <rect x="29.5" y="25" width="4" height="11" rx="1.4" fill="#0EA2FF" />
              <rect x="35" y="28" width="4" height="8" rx="1.4" fill="#1D4FD7" />
            </g>
          </svg>
        </div>
        <h1>DEAL<span>MAP</span></h1>
        <p>Don&rsquo;t overpay.</p>
        <div className="loadbar" aria-hidden="true"><i /></div>
      </div>
    </div>
  );
}
