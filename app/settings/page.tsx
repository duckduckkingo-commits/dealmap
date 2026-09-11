"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@/components/ui-helpers";

export default function SettingsPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [msg, setMsg] = useState("");
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("system");
  const [accent, setAccent] = useState("blue");
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [warranty, setWarranty] = useState(true);
  const [weekly, setWeekly] = useState(false);

  useEffect(() => {
    const c = (n: string) => document.cookie.match(new RegExp(n + "=([^;]+)"))?.[1];
    if (c("dm_lang")) setLang(decodeURIComponent(c("dm_lang")!));
    if (c("dm_theme")) setTheme(decodeURIComponent(c("dm_theme")!));
    if (c("dm_accent")) setAccent(decodeURIComponent(c("dm_accent")!));
    try {
      setPriceAlerts(localStorage.getItem("dm_n_price") !== "0");
      setWarranty(localStorage.getItem("dm_n_warranty") !== "0");
      setWeekly(localStorage.getItem("dm_n_weekly") === "1");
    } catch {}
  }, []);

  function savePrefs() {
    document.cookie = `dm_lang=${lang};path=/;max-age=31536000`;
    document.cookie = `dm_theme=${theme};path=/;max-age=31536000`;
    document.cookie = `dm_accent=${accent};path=/;max-age=31536000`;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (theme !== "system") document.documentElement.dataset.theme = theme;
    else if (matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    document.documentElement.dataset.accent = accent;
    try {
      localStorage.setItem("dm_lang", lang);
      localStorage.setItem("dm_n_price", priceAlerts ? "1" : "0");
      localStorage.setItem("dm_n_warranty", warranty ? "1" : "0");
      localStorage.setItem("dm_n_weekly", weekly ? "1" : "0");
    } catch {}
    setMsg("Preferences saved ✓");
    toast("Preferences saved ✓");
    setTimeout(() => location.reload(), 600);
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setMsg("New password must be 8+ characters."); return; }
    const res = await fetch("/api/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "change", currentPassword, newPassword, revokeOthers: true }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Password changed ✓ Other sessions revoked." : (d.error || "Failed — are you logged in?"));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    toast("Logged out");
    location.href = "/";
  }

  function Toggle({ v, set, label }: { v: boolean; set: (b: boolean) => void; label: string }) {
    return <button className="toggle" role="switch" aria-checked={v} aria-label={label} onClick={() => set(!v)} type="button" />;
  }

  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Settings</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Language, theme, notifications, privacy & security.</p>
      {msg && <p className="alert" role="status">{msg}</p>}
      <div className="grid cols2">
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>🌍 Language</h2>
            <div role="radiogroup" aria-label="Language">
              {[["fr", "Français 🇲🇦"], ["ar", "العربية 🇲🇦 (RTL)"], ["en", "English 🇬🇧"]].map(([v, l]) => (
                <button key={v} className={`lang-opt${lang === v ? " sel" : ""}`} onClick={() => setLang(v)} aria-pressed={lang === v} type="button">{l}</button>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>🎨 Theme</h2>
            <label htmlFor="theme">Appearance</label>
            <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="system">System (auto)</option><option value="light">Light ☀️</option><option value="dark">Dark 🌙</option>
            </select>
            <label htmlFor="accent">Accent color</label>
            <select id="accent" value={accent} onChange={(e) => setAccent(e.target.value)}>
              <option value="blue">DealMap Blue</option><option value="green">Green</option><option value="purple">Purple</option>
              <option value="orange">Orange</option><option value="teal">Teal</option><option value="rose">Rose</option>
            </select>
            <div style={{ marginTop: 12 }}><button className="btn block" onClick={savePrefs} type="button">Save preferences</button></div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>🔔 Notifications</h2>
            <div className="set-row"><span className="ico" aria-hidden="true">💰</span> Price-drop alerts <span style={{ marginInlineStart: "auto" }}><Toggle v={priceAlerts} set={setPriceAlerts} label="Price-drop alerts" /></span></div>
            <div className="set-row"><span className="ico" aria-hidden="true">🛡️</span> Warranty & return reminders <span style={{ marginInlineStart: "auto" }}><Toggle v={warranty} set={setWarranty} label="Warranty reminders" /></span></div>
            <div className="set-row"><span className="ico" aria-hidden="true">📊</span> Weekly market digest <span style={{ marginInlineStart: "auto" }}><Toggle v={weekly} set={setWeekly} label="Weekly digest" /></span></div>
            <div className="cta-row" style={{ marginTop: 10 }}>
              <button className="btn secondary small" type="button" onClick={savePrefs}>Save</button>
              <Link className="btn ghost small" href="/notifications">View notifications →</Link>
            </div>
            <p style={{ color: "var(--muted)", fontSize: ".83rem" }}>In-app notifications work now. Email activates when EMAIL_PROVIDER is configured.</p>
          </div>
        </div>
        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>🔒 Privacy & security</h2>
            <form onSubmit={changePw}>
              <label htmlFor="c">Current password</label><input id="c" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
              <label htmlFor="n">New password (8+ chars)</label><input id="n" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={8} autoComplete="new-password" />
              <div style={{ marginTop: 12 }}><button className="btn block" type="submit">Update password</button></div>
            </form>
            <div className="set-row" style={{ marginTop: 8 }}><span className="ico" aria-hidden="true">📱</span> Two-factor (TOTP / passkeys)<span className="chev">Coming soon</span></div>
            <Link className="set-row" href="/settings/security"><span className="ico" aria-hidden="true">🛡️</span> Sessions & security details <span className="chev">→</span></Link>
            <div style={{ marginTop: 12 }}><button className="btn secondary block" onClick={logout} type="button">Log out</button></div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2 style={{ marginTop: 0 }}>❓ Help & support</h2>
            <Link className="set-row" href="/help"><span className="ico" aria-hidden="true">📖</span> Help center & FAQ <span className="chev">→</span></Link>
            <Link className="set-row" href="/help#contact"><span className="ico" aria-hidden="true">✉️</span> Contact support <span className="chev">→</span></Link>
            <Link className="set-row" href="/profile"><span className="ico" aria-hidden="true">👤</span> My profile <span className="chev">→</span></Link>
            <Link className="set-row" href="/purchases"><span className="ico" aria-hidden="true">🧾</span> Purchases & warranties <span className="chev">→</span></Link>
          </div>
        </div>
      </div>
    </>
  );
}
