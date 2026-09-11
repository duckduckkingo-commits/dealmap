import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { purchaseSchema } from "@/lib/validation";
import { v4 as uuid } from "uuid";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDB();
  // NEVER expose another user's purchases: filter by owner id server-side.
  return NextResponse.json({
    purchases: db.purchases.filter((p) => p.userId === s.sub),
    warranties: db.warranties.filter((w) => w.userId === s.sub),
    returns: db.returns.filter((r) => r.userId === s.sub),
    receipts: db.receipts.filter((r) => r.userId === s.sub).map((r) => ({ ...r, dataBase64: undefined })),
  });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "delete") {
    await updateDB((db) => {
      db.purchases = db.purchases.filter((p) => !(p.id === body.id && p.userId === s.sub));
      db.warranties = db.warranties.filter((w) => !(w.purchaseId === body.id && w.userId === s.sub));
      db.returns = db.returns.filter((r) => !(r.purchaseId === body.id && r.userId === s.sub));
    });
    return NextResponse.json({ ok: true });
  }
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const id = `pu_${uuid().slice(0, 8)}`;
  const d = parsed.data;
  await updateDB((db) => {
    db.purchases.push({
      id, userId: s.sub, productId: d.productId, price: d.price, currency: "MAD",
      date: d.date, seller: d.seller, store: d.store, serialNumber: d.serialNumber,
      warrantyMonths: d.warrantyMonths, returnDeadline: d.returnDeadline, notes: d.notes,
      createdAt: new Date().toISOString(),
    });
    if (d.warrantyMonths && d.warrantyMonths > 0) {
      const start = new Date(d.date);
      const end = new Date(start);
      end.setMonth(end.getMonth() + d.warrantyMonths);
      db.warranties.push({ id: `wr_${uuid().slice(0, 8)}`, userId: s.sub, purchaseId: id, productId: d.productId, startDate: start.toISOString(), endDate: end.toISOString(), seller: d.seller, notes: d.notes });
    }
    if (d.returnDeadline) {
      db.returns.push({ id: `rt_${uuid().slice(0, 8)}`, userId: s.sub, purchaseId: id, deadline: d.returnDeadline, status: "pending", seller: d.seller, notes: d.notes });
    }
    db.analytics.push({ id: `an_${id}`, event: "PURCHASE_CREATED", userId: s.sub, productId: d.productId, createdAt: new Date().toISOString() });
  });
  return NextResponse.json({ ok: true, id });
}
