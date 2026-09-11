import SavedList from "@/components/SavedList";
import Link from "next/link";

export const metadata = { title: "Saved — DEALMAP", robots: { index: false } };

export default function WatchlistPage({ searchParams }: { searchParams: { add?: string } }) {
  return (
    <>
      <h1 style={{ marginBottom: 4 }}>Saved</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>Your saved products & watchlist · <Link href="/alerts">Manage alerts →</Link></p>
      <SavedList initialAdd={searchParams.add} />
      <div className="cta-row" style={{ marginTop: 16 }}>
        <Link className="btn secondary" href="/compare">⇄ Compare saved</Link>
        <Link className="btn secondary" href="/explore">+ Add more products</Link>
      </div>
    </>
  );
}
