import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Admin + Owner operations. OWNER-only actions are enforced here server-side. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "OWNER")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "overview";
  const db = await readDB();
  if (scope === "overview") {
    return NextResponse.json({
      users: db.users.length,
      products: db.products.length + 12,
      observations: db.observations.length + 51,
      contributions: db.contributions.length,
      reports: db.reports.length,
      alerts: db.alerts.length,
      analytics: db.analytics.slice(-100),
      audit: s.role === "OWNER" ? db.audit.slice(-100).reverse() : [],
      contributionsList: db.contributions.slice(-30).reverse(),
      reportsList: db.reports.slice(-30).reverse(),
      usersList: db.users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt, reputation: u.reputation })),
    });
  }
  return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || (s.role !== "ADMIN" && s.role !== "OWNER")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action: string };
  // OWNER-only: manage admins, system settings
  if ((action === "make-admin" || action === "remove-admin" || action === "system-setting") && s.role !== "OWNER") {
    await audit("ADMIN_REJECTED_OWNER_OP", { actorId: s.sub, result: "blocked" });
    return NextResponse.json({ error: "Forbidden: OWNER only" }, { status: 403 });
  }
  // ADMIN/OWNER can moderate contributions & reports
  if (action === "moderate-contribution") {
    await updateDB((db) => {
      const c = db.contributions.find((x) => x.id === body.id);
      if (c) c.status = body.decision === "approve" ? "approved" : "rejected";
      const obs = db.observations.find((o) => o.id === `obs_${body.id}`);
      if (obs) obs.verificationStatus = body.decision === "approve" ? "verified" : "rejected";
      const u = db.users.find((x) => x.id === c?.userId);
      if (u) u.reputation = Math.max(0, u.reputation + (body.decision === "approve" ? 5 : -3));
    });
    await audit("MODERATION", { actorId: s.sub, target: body.id, result: "ok" });
    return NextResponse.json({ ok: true });
  }
  if (action === "make-admin") {
    await updateDB((db) => {
      const u = db.users.find((x) => x.id === body.userId);
      if (u && u.role === "USER") u.role = "ADMIN";
    });
    await audit("ADMIN_CREATED", { actorId: s.sub, target: body.userId, result: "ok" });
    return NextResponse.json({ ok: true });
  }
  if (action === "remove-admin") {
    await updateDB((db) => {
      const u = db.users.find((x) => x.id === body.userId);
      if (u && u.role === "ADMIN") u.role = "USER";
    });
    await audit("ADMIN_REMOVED", { actorId: s.sub, target: body.userId, result: "ok" });
    return NextResponse.json({ ok: true });
  }
  if (action === "report") {
    const db = await readDB();
    const id = `rep_${Date.now().toString(36)}`;
    await updateDB((d) => {
      d.reports.push({ id, userId: s.sub, targetType: body.targetType ?? "product", targetId: body.targetId ?? "", reason: String(body.reason ?? "").slice(0, 500), status: "open", createdAt: new Date().toISOString() });
    });
    void db;
    return NextResponse.json({ ok: true, id });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
