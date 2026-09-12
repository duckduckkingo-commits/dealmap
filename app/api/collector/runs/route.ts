// /api/collector/runs — scheduler ledger + manual tick (admin only).
// New route. Reuses requireRole/audit. Modifies nothing existing.
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getSession, requireRole } from "@/lib/auth";
import { tickSchema } from "@/lib/collector/schemas";
import { health, tick } from "@/lib/collector/scheduler";
import { readCollector, saveCollector } from "@/lib/collector/store";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "OWNER")) {
    return NextResponse.json({ error: "Forbidden — ADMIN or OWNER only." }, { status: 403 });
  }
  const db = await readCollector();
  return NextResponse.json({
    health: health(db),
    runs: db.runs.slice(0, 20),
    stores: db.stores,
    submissions: db.submissions.filter((x) => x.status === "pending").slice(0, 100),
  });
}

export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN", "OWNER"]);
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 403;
    return NextResponse.json({ error: status === 401 ? "Login required." : "Forbidden — ADMIN or OWNER only." }, { status });
  }
  const body = await req.json().catch(() => ({}));
  // Toggle automatic re-checking for one store (default OFF everywhere).
  if (body.action === "recheck") {
    const p = z.object({ action: z.literal("recheck"), id: z.string().min(1).max(80), on: z.boolean() }).safeParse(body);
    if (!p.success) return NextResponse.json({ error: "Invalid recheck toggle." }, { status: 400 });
    const db = await readCollector();
    const store = db.stores.find((s) => s.id === p.data.id);
    if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });
    store.allowRecheck = p.data.on;
    await saveCollector(db);
    await audit("COLLECTOR_RECHECK_TOGGLE", { result: p.data.on ? "on" : "off", target: p.data.id }).catch(() => undefined);
    return NextResponse.json({ ok: true, id: store.id, allowRecheck: store.allowRecheck });
  }
  const parsed = tickSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid tick request." }, { status: 400 });
  const db = await readCollector();
  const run = await tick(db, parsed.data.limit);
  await saveCollector(db);
  await audit("COLLECTOR_TICK", { result: run.status }).catch(() => undefined);
  return NextResponse.json({ run, health: health(db) });
}
