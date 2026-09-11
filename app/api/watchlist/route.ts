import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { watchlistSchema } from "@/lib/validation";
import { v4 as uuid } from "uuid";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDB();
  return NextResponse.json({ items: db.watchlists.filter((w) => w.userId === s.sub) });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    db.analytics.push({ id: `an_${id}`, event: "WATCHLIST_ADD", userId: s.sub, productId: parsed.data.productId, createdAt: new Date().toISOString() });
  });
  return NextResponse.json({ ok: true, id });
}
