"use client";
import { useEffect, useState } from "react";

function currentTheme(): string {
  if (typeof document === "undefined") return "system";
  const m = document.cookie.match(/dm_theme=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return document.documentElement.dataset.theme ?? "system";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("system");
  useEffect(() => { setTheme(currentTheme()); }, []);
  function cycle() {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    document.cookie = `dm_theme=${next};path=/;max-age=31536000`;
    if (next === "system") {
      delete document.documentElement.dataset.theme;
      if (matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.dataset.theme = "dark";
    } else {
      document.documentElement.dataset.theme = next;
    }
  }
  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "◐";
  return (
    <button className="icon-btn" onClick={cycle} aria-label={`Theme: ${theme}. Activate to change theme`} title={`Theme: ${theme}`}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
