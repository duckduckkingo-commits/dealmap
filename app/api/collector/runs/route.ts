// /api/collector/runs — scheduler ledger + manual tick (admin only).
// New route. Reuses requireRole/audit. Modifies nothing existing.
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getSession, requireRole } from "@/lib/auth";
import { tickSchema } from "@/lib/collector/schemas";
import { health, tick } from "@/lib/collector/scheduler";
import { readCollector, saveCollector } from "@/lib/collector/store";

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
  const parsed = tickSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid tick request." }, { status: 400 });
  const db = await readCollector();
  const run = await tick(db, parsed.data.limit);
  await saveCollector(db);
  await audit("COLLECTOR_TICK", { result: run.status }).catch(() => undefined);
  return NextResponse.json({ run, health: health(db) });
}
