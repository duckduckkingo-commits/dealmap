import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { setupSchema } from "@/lib/validation";
import { rateLimit, clientKey, LIMITS } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { v4 as uuid } from "uuid";

/**
 * POST /api/setup — first OWNER creation only.
 * Protected by: enabled flag + no-owner check + optional secret + atomic updateDB + unique OWNER rule.
 * Role is assigned server-side; client role field is ignored/rejected.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "setup"), LIMITS.setup.limit, LIMITS.setup.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const enabled = (process.env.INITIAL_OWNER_SETUP_ENABLED ?? "true") === "true";
  if (!enabled) { await audit("SETUP_BLOCKED", { result: "blocked:disabled" }); return NextResponse.json({ error: "Not found" }, { status: 404 }); }

  const body = await req.json().catch(() => ({}));
  if (body.role && body.role !== "OWNER") { /* ignore client role */ }
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const configuredSecret = process.env.INITIAL_OWNER_SETUP_SECRET || "";
  if (configuredSecret && parsed.data.setupSecret !== configuredSecret) {
    await audit("SETUP_BLOCKED", { result: "blocked:bad-secret" });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  let created: { id: string } | null = null;
  let blocked = false;
  await updateDB((db) => {
    const ownerExists = db.users.some((u) => u.role === "OWNER");
    if (ownerExists) { blocked = true; return; }
    if (db.users.some((u) => u.email.toLowerCase() === email)) { blocked = true; return; }
    const id = `u_${uuid().slice(0, 8)}`;
    // passwordHash computed outside? must be sync-safe: placeholder replaced below
    (db as unknown as { _pendingOwner?: unknown })._pendingOwner = { id, name: parsed.data.name, email };
    created = { id };
  });
  if (blocked || !created) { await audit("SETUP_BLOCKED", { result: "blocked:owner-exists" }); return NextResponse.json({ error: "Not found" }, { status: 404 }); }

  const passwordHash = await hashPassword(parsed.data.password);
  const ownerId = (created as unknown as { id: string }).id;
  const sid = `s_${uuid().slice(0, 8)}`;
  await updateDB((db) => {
    const pending = (db as unknown as { _pendingOwner?: { id: string; name: string; email: string } })._pendingOwner;
    delete (db as unknown as { _pendingOwner?: unknown })._pendingOwner;
    const name = pending?.name ?? parsed.data.name;
    // Enforce single OWNER atomically
    if (db.users.some((u) => u.role === "OWNER")) return;
    db.users.push({ id: ownerId, email, name, role: "OWNER", createdAt: new Date().toISOString(), reputation: 100, language: "fr", theme: "system", accent: "blue", passwordHash, verified: true });
    db.sessions.push({ id: sid, userId: ownerId, createdAt: new Date().toISOString(), revoked: false });
  });
  const finalCheck = await readDB();
  const owners = finalCheck.users.filter((u) => u.role === "OWNER");
  if (owners.length !== 1) { await audit("SETUP_BLOCKED", { result: "blocked:race" }); return NextResponse.json({ error: "Not found" }, { status: 404 }); }

  await audit("OWNER_CREATED", { actorId: ownerId, result: "ok" });
  const token = signSession({ sub: ownerId, role: "OWNER", email, sid });
  const res = NextResponse.json({ ok: true, redirect: "/owner" });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  return res;
}

export async function GET() {
  // Never reveal whether an owner exists: always generic.
  return NextResponse.json({ ok: true });
}
