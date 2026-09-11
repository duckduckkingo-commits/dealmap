import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { watchlistSchema, alertSchema, contributeSchema, purchaseSchema } from "@/lib/validation";
import { rateLimit, clientKey, LIMITS } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { v4 as uuid } from "uuid";

async function me() {
  const s = await getSession();
  return s;
}

// Watchlist
export async function handleWatchlist(req: Request) {
  const s = await me();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (req.method === "GET") {
    const db = await readDB();
    return NextResponse.json({ items: db.watchlists.filter((w) => w.userId === s.sub) });
  }
  const body = await req.json().catch(() => ({}));
  if (body.action === "remove") {
    await updateDB((db) => { db.watchlists = db.watchlists.filter((w) => !(w.userId === s.sub && w.productId === body.productId)); });
    return NextResponse.json({ ok: true });
  }
  const parsed = watchlistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const id = `w_${uuid().slice(0, 8)}`;
  await updateDB((db) => {
    db.watchlists = db.watchlists.filter((w) => !(w.userId === s.sub && w.productId === parsed.data.productId));
    db.watchlists.push({ id, userId: s.sub, productId: parsed.data.productId, targetPrice: parsed.data.targetPrice, targetScore: parsed.data.targetScore, createdAt: new Date().toISOString() });
  });
  return NextResponse.json({ ok: true, id });
}
