// /api/collector/submissions — user-submitted deals (open) + admin review.
// New route. Reuses validation, rate limiting, role gating. Modifies nothing existing.
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { submissionReviewSchema, submissionSchema } from "@/lib/collector/schemas";
import { readCollector, saveCollector } from "@/lib/collector/store";
import { extractListing, isBlockedHostname } from "@/lib/collector/adapters";

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
    if (parsed.data.action === "reject") {
      item.status = "rejected";
      await saveCollector(db);
      await audit("COLLECTOR_SUBMISSION_REVIEW", { result: "rejected" }).catch(() => undefined);
      return NextResponse.json({ ok: true, status: item.status });
    }
    // Verify = live re-check of the link before it counts. Dead link,
    // missing price, or private host → rejected with the reason.
    if (item.url) {
      try {
        const host = new URL(item.url).hostname;
        if (isBlockedHostname(host)) {
          item.status = "rejected";
          await saveCollector(db);
          return NextResponse.json({ ok: true, status: "rejected", reason: "Link host not allowed." });
        }
      } catch {
        item.status = "rejected";
        await saveCollector(db);
        return NextResponse.json({ ok: true, status: "rejected", reason: "Bad link." });
      }
      const live = await extractListing(item.url);
      if (live.price.value === null) {
        item.status = "rejected";
        await saveCollector(db);
        await audit("COLLECTOR_SUBMISSION_REVIEW", { result: "rejected:no-price" }).catch(() => undefined);
        return NextResponse.json({ ok: true, status: "rejected", reason: "No verifiable price on the page." });
      }
      item.status = "verified";
      item.price = live.price.value;
      if (live.name.value) item.productName = live.name.value;
      await saveCollector(db);
      await audit("COLLECTOR_SUBMISSION_REVIEW", { result: "verified" }).catch(() => undefined);
      return NextResponse.json({ ok: true, status: "verified", price: live.price.value });
    }
    item.status = "verified";
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
