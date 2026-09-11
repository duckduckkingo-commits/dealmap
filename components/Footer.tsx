import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import Link from "next/link";

export default function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="site">
      <div className="wrap">
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <img src="/logo.svg" alt="" width={26} height={26} style={{ borderRadius: 8 }} aria-hidden="true" />
          <strong style={{ color: "var(--fg)" }}>DEALMAP</strong>
          <span>· Don&rsquo;t overpay.</span>
        </div>
        <p style={{ margin: "4px 0" }}>{t(locale, "allRights")} · Casablanca, Morocco · MAD · ar / fr / en</p>
        <p style={{ fontSize: ".85rem", margin: "4px 0" }}>
          <Link href="/help">Help & support</Link> · <Link href="/notifications">Notifications</Link> ·{" "}
          <Link href="/settings">Privacy & security</Link> · <Link href="/contribute">Contribute</Link>
        </p>
        <p style={{ fontSize: ".82rem" }}>Market-based analysis only. No fake AI. No fake payments. No invented statistics.</p>
      </div>
    </footer>
  );
}
