"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

const LANGS: { code: Locale; label: string; sub: string; flag: string }[] = [
  { code: "fr", label: "Français", sub: "Langue par défaut au Maroc", flag: "🇲🇦" },
  { code: "ar", label: "العربية", sub: "دعم كامل RTL", flag: "🇲🇦" },
  { code: "en", label: "English", sub: "International", flag: "🇬🇧" },
];

const STEPS = [
  { icon: "🏷️", title: "Know the real value before you buy", text: "We analyse market prices, compare offers and show you the fair price — so you never overpay." },
  { icon: "📊", title: "Deal Score, price history & comparison", text: "A 0–100 market-based score, honest price history and side-by-side comparison across sellers." },
  { icon: "🔔", title: "Save, watch & get alerted", text: "Save products, track your watchlist and get alerted when the price drops to your target." },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0); // 0 = language, 1..3 = slides
  const [lang, setLang] = useState<Locale>("fr");

  function finish() {
    document.cookie = `dm_lang=${lang};path=/;max-age=31536000`;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("dm_onboarded", "1"); localStorage.setItem("dm_lang", lang); } catch {}
    onDone();
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label="Welcome to DEALMAP">
      <div className="onboard-sheet">
        {step === 0 ? (
          <>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: ".85rem", fontWeight: 700 }}>STEP 1 OF 4</p>
            <h2 style={{ margin: "4px 0 4px" }}>Choose your language</h2>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>Choisissez votre langue · اختر لغتك</p>
            {LANGS.map((l) => (
              <button key={l.code} className={`lang-opt${lang === l.code ? " sel" : ""}`} onClick={() => setLang(l.code)} aria-pressed={lang === l.code}>
                <span style={{ fontSize: "1.5rem" }} aria-hidden="true">{l.flag}</span>
                <span>{l.label}<br /><small style={{ color: "var(--muted)", fontWeight: 400 }}>{l.sub}</small></span>
                <span style={{ marginInlineStart: "auto", color: "var(--accent)" }} aria-hidden="true">{lang === l.code ? "●" : "○"}</span>
              </button>
            ))}
            <button className="btn block" onClick={() => setStep(1)}>Continue</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", textAlign: "center" }} aria-hidden="true">{STEPS[step - 1].icon}</div>
            <h2 style={{ textAlign: "center", margin: "8px 0" }}>{STEPS[step - 1].title}</h2>
            <p style={{ textAlign: "center", color: "var(--muted)" }}>{STEPS[step - 1].text}</p>
            <div className="onboard-dots" aria-hidden="true">
              {[1, 2, 3].map((i) => <i key={i} className={step === i ? "on" : ""} />)}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {step > 1
                ? <button className="btn secondary" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>Back</button>
                : <button className="btn ghost" style={{ flex: 1 }} onClick={finish}>Skip</button>}
              {step < 3
                ? <button className="btn" style={{ flex: 2 }} onClick={() => setStep(step + 1)}>Continue</button>
                : <button className="btn" style={{ flex: 2 }} onClick={finish}>Get Started</button>}
            </div>
            <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".8rem", marginBottom: 0 }}>DEALMAP · Don&rsquo;t overpay. · Casablanca, Morocco · MAD</p>
          </>
        )}
      </div>
    </div>
  );
}
