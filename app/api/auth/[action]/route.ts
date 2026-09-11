import { NextResponse } from "next/server";
import { updateDB, readDB } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validation";
import { rateLimit, clientKey, LIMITS } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { v4 as uuid } from "uuid";

export async function POST(req: Request, { params }: { params: { action: string } }) {
  const action = params.action;
  const body = await req.json().catch(() => ({}));
  if (action === "register") {
    const rl = rateLimit(clientKey(req, "register"), LIMITS.register.limit, LIMITS.register.windowMs);
    if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    const { name, email, password } = parsed.data;
    const normEmail = email.toLowerCase().trim();
    const existing = (await readDB()).users.find((u) => u.email.toLowerCase() === normEmail);
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    const id = `u_${uuid().slice(0, 8)}`;
    const passwordHash = await hashPassword(password);
    const sid = `s_${uuid().slice(0, 8)}`;
    await updateDB((db) => {
      db.users.push({ id, email: normEmail, name, role: "USER", createdAt: new Date().toISOString(), reputation: 0, language: "fr", theme: "system", accent: "blue", passwordHash, verified: false });
      db.sessions.push({ id: sid, userId: id, createdAt: new Date().toISOString(), revoked: false });
      db.analytics.push({ id: `an_${id}`, event: "REGISTRATION", userId: id, createdAt: new Date().toISOString() });
    });
    await audit("REGISTRATION", { actorId: id, result: "ok" });
    const token = signSession({ sub: id, role: "USER", email: normEmail, sid });
    const res = NextResponse.json({ ok: true, verifyRequired: true, message: "Account created. Email verification required (see email setup in docs)." });
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
    return res;
  }
  if (action === "login") {
    const rl = rateLimit(clientKey(req, "login"), LIMITS.login.limit, LIMITS.login.windowMs);
    if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const db = await readDB();
    const user = db.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase().trim());
    if (!user) { await audit("LOGIN_FAILED", { result: "fail" }); return NextResponse.json({ error: "Invalid credentials" }, { status: 401 }); }
    const { default: bcrypt } = await import("bcryptjs");
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) { await audit("LOGIN_FAILED", { actorId: user.id, result: "fail" }); return NextResponse.json({ error: "Invalid credentials" }, { status: 401 }); }
    const sid = `s_${uuid().slice(0, 8)}`;
    await updateDB((d) => { d.sessions.push({ id: sid, userId: user.id, createdAt: new Date().toISOString(), userAgent: req.headers.get("user-agent") ?? undefined, revoked: false }); });
    await audit(user.role === "OWNER" ? "OWNER_LOGIN" : "LOGIN", { actorId: user.id, result: "ok" });
    const token = signSession({ sub: user.id, role: user.role, email: user.email, sid });
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
    return res;
  }
  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 404 });
}
