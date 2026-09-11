import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { contributeSchema } from "@/lib/validation";
import { rateLimit, clientKey, LIMITS } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { v4 as uuid } from "uuid";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ items: db.contributions.slice(-50).reverse() });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = rateLimit(clientKey(req, "contribute"), LIMITS.contribute.limit, LIMITS.contribute.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many contributions. Slow down." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = contributeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  // Anti-fraud: duplicate check (same user+product+price within 10 min)
  const db0 = await readDB();
  const recent = db0.contributions.find((c) => c.userId === s.sub && c.productId === d.productId && c.price === d.price && Date.now() - +new Date(c.createdAt) < 10 * 60_000);
  if (recent) return NextResponse.json({ error: "Duplicate contribution detected. Please wait before resubmitting." }, { status: 409 });
  const id = `c_${uuid().slice(0, 8)}`;
  await updateDB((db) => {
    db.contributions.push({ id, userId: s.sub, productId: d.productId, price: d.price, currency: d.currency, condition: d.condition, sourceType: "user_report", location: d.location, createdAt: new Date().toISOString(), status: "pending" });
    db.observations.push({
      id: `obs_${id}`, productId: d.productId, price: d.price, currency: d.currency,
      condition: d.condition, sellerType: d.sellerType, location: d.location, sourceType: "user_report",
      observedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      quality: "LOW", verificationStatus: "pending", contributorId: s.sub,
    });
    db.analytics.push({ id: `an_${id}`, event: "CONTRIBUTION", userId: s.sub, productId: d.productId, createdAt: new Date().toISOString() });
  });
  await audit("CONTRIBUTION", { actorId: s.sub, target: d.productId, result: "ok" });
  return NextResponse.json({ ok: true, id });
}
