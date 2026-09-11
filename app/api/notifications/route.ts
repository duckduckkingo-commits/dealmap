import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDB();
  return NextResponse.json({ items: db.notifications.filter((n) => n.userId === s.sub).slice(-30).reverse() });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "read") {
    await updateDB((db) => {
      const n = db.notifications.find((x) => x.id === body.id && x.userId === s.sub);
      if (n) n.read = true;
    });
  }
  if (body.action === "prefs") {
    await updateDB((db) => {
      db.settings[`prefs_${s.sub}`] = JSON.stringify(body.prefs ?? {});
    });
  }
  return NextResponse.json({ ok: true });
}
