import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header({ locale }: { locale: Locale }) {
  return (
    <header className="top">
      <div className="wrap nav" role="navigation" aria-label="Main">
        <Link className="brand" href="/" aria-label="DEALMAP home — Don't overpay">
          <img src="/logo.svg" alt="" width={34} height={34} aria-hidden="true" />
          <span>
            DEAL<span style={{ color: "var(--accent)" }}>MAP</span>
            <small>Don&rsquo;t overpay.</small>
          </span>
        </Link>
        <nav className="links" aria-label="Primary">
          <Link href="/explore">{locale === "ar" ? "استكشف" : locale === "en" ? "Explore" : "Explorer"}</Link>
          <Link href="/analyze">Analyze</Link>
          <Link href="/deals">Deals</Link>
          <Link href="/search">{t(locale, "search")}</Link>
          <Link href="/compare">{t(locale, "compare")}</Link>
          <Link href="/watchlist">{t(locale, "watchlist")}</Link>
          <Link href="/alerts">{t(locale, "alerts")}</Link>
          <Link href="/purchases">{t(locale, "purchases")}</Link>
          <Link href="/contribute">{t(locale, "contribute")}</Link>
          <Link href="/settings">{t(locale, "settings")}</Link>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link className="icon-btn" href="/search" aria-label="Search products" style={{ textDecoration: "none" }}>⌕</Link>
        </div>
      </div>
    </header>
  );
}
