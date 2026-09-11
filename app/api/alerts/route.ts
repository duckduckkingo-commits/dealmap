import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { alertSchema } from "@/lib/validation";
import { v4 as uuid } from "uuid";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDB();
  return NextResponse.json({ items: db.alerts.filter((a) => a.userId === s.sub) });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "delete") {
    await updateDB((db) => { db.alerts = db.alerts.filter((a) => !(a.id === body.id && a.userId === s.sub)); });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "toggle") {
    await updateDB((db) => {
      const a = db.alerts.find((x) => x.id === body.id && x.userId === s.sub);
      if (a) a.active = !a.active;
    });
    return NextResponse.json({ ok: true });
  }
  const parsed = alertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const id = `a_${uuid().slice(0, 8)}`;
  await updateDB((db) => {
    db.alerts.push({ id, userId: s.sub, productId: parsed.data.productId, type: parsed.data.type, targetPrice: parsed.data.targetPrice, targetScore: parsed.data.targetScore, active: true, createdAt: new Date().toISOString() });
    db.analytics.push({ id: `an_${id}`, event: "ALERT_CREATED", userId: s.sub, productId: parsed.data.productId, createdAt: new Date().toISOString() });
  });
  return NextResponse.json({ ok: true, id });
}
