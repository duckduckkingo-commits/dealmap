// /api/collector/submissions — user-submitted deals (open) + admin review.
// New route. Reuses validation, rate limiting, role gating. Modifies nothing existing.
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { submissionReviewSchema, submissionSchema } from "@/lib/collector/schemas";
import { readCollector, saveCollector } from "@/lib/collector/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Admin review path.
  if (body.action === "verify" || body.action === "reject") {
    try {
      await requireRole(["ADMIN", "OWNER"]);
    } catch (e) {
      const status = (e as Error & { status?: number }).status ?? 403;
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    const parsed = submissionReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
    const db = await readCollector();
    const item = db.submissions.find((s) => s.id === parsed.data.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    item.status = parsed.data.action === "verify" ? "verified" : "rejected";
    await saveCollector(db);
    await audit("COLLECTOR_SUBMISSION_REVIEW", { result: item.status }).catch(() => undefined);
    return NextResponse.json({ ok: true, status: item.status });
  }
  // Public submit path.
  const rl = rateLimit(clientKey(req, "collector-submit"), 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many submissions — wait a minute." }, { status: 429 });
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  const d = parsed.data;
  if (!d.url && !d.productName) return NextResponse.json({ error: "Provide a link or a product name." }, { status: 400 });
  const db = await readCollector();
  db.submissions.unshift({
    id: `sub_${Date.now().toString(36)}`,
    url: d.url || null,
    productName: d.productName || null,
    storeName: d.storeName || null,
    price: d.price ?? null,
    currency: d.currency || "MAD",
    condition: d.condition || null,
    notes: d.notes || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await saveCollector(db);
  await audit("COLLECTOR_SUBMIT", { result: "pending" }).catch(() => undefined);
  return NextResponse.json({ ok: true, message: "Deal received — pending admin verification. Thank you!" });
}
