"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "⌂", match: (p: string) => p === "/" },
  { href: "/explore", label: "Explore", icon: "◉", match: (p: string) => p.startsWith("/explore") || p.startsWith("/search") || p.startsWith("/product") },
  { href: "/compare", label: "Compare", icon: "⇄", match: (p: string) => p.startsWith("/compare") },
  { href: "/watchlist", label: "Saved", icon: "♡", match: (p: string) => p.startsWith("/watchlist") || p.startsWith("/alerts") },
  { href: "/profile", label: "Profile", icon: "○", match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings") || p.startsWith("/purchases") || p.startsWith("/warranties") || p.startsWith("/dashboard") },
];

export default function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav className="bottomnav" aria-label="Bottom navigation">
      <div className="bottomnav-inner">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>
              <span className="ico" aria-hidden="true">{active && t.label === "Saved" ? "♥" : t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
