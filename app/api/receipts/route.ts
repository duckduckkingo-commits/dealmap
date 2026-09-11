import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sanitizeFileName, assertSafePath, ALLOWED_RECEIPT_MIME, MAX_RECEIPT_BYTES } from "@/lib/validation";
import { rateLimit, clientKey, LIMITS } from "@/lib/rateLimit";
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = rateLimit(clientKey(req, "upload"), LIMITS.upload.limit, LIMITS.upload.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const { fileName, mime, dataBase64, purchaseId } = body as { fileName: string; mime: string; dataBase64: string; purchaseId?: string };
  if (!fileName || !mime || !dataBase64) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!ALLOWED_RECEIPT_MIME.includes(mime)) return NextResponse.json({ error: "File type not allowed (jpeg/png/webp/pdf only)" }, { status: 415 });
  const buf = Buffer.from(dataBase64.split(",").pop() || "", "base64");
  if (buf.length > MAX_RECEIPT_BYTES) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  const safe = sanitizeFileName(fileName);
  try { assertSafePath(safe); } catch { return NextResponse.json({ error: "Unsafe file name" }, { status: 400 }); }
  const id = `rc_${uuid().slice(0, 8)}`;
  await updateDB((db) => {
    db.receipts.push({ id, userId: s.sub, purchaseId, fileName: safe, mime, size: buf.length, dataBase64: dataBase64.slice(0, 7_000_000), createdAt: new Date().toISOString() });
  });
  return NextResponse.json({ ok: true, id, fileName: safe, size: buf.length });
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const db = await readDB();
  if (id) {
    const r = db.receipts.find((x) => x.id === id && x.userId === s.sub);
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (url.searchParams.get("download") === "1") return NextResponse.json({ ...r });
    const { dataBase64, ...meta } = r;
    void dataBase64;
    return NextResponse.json({ receipt: meta });
  }
  return NextResponse.json({ receipts: db.receipts.filter((x) => x.userId === s.sub).map((r) => ({ id: r.id, fileName: r.fileName, mime: r.mime, size: r.size, purchaseId: r.purchaseId, createdAt: r.createdAt })) });
}

export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await updateDB((db) => { db.receipts = db.receipts.filter((r) => !(r.id === body.id && r.userId === s.sub)); });
  return NextResponse.json({ ok: true });
}
