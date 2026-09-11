import { NextResponse } from "next/server";
import { readDB, updateDB } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { rateLimit, clientKey, LIMITS } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { v4 as uuid } from "uuid";

/** POST {step:'forgot', email} | {step:'reset', token, password} | {step:'change', currentPassword, newPassword} */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.step === "forgot") {
    const rl = rateLimit(clientKey(req, "reset"), LIMITS.reset.limit, LIMITS.reset.windowMs);
    if (!rl.ok) return NextResponse.json({ message: "If this email exists, a reset link was sent." });
    const parsed = emailSchema.safeParse(body.email);
    // Generic response — never reveal whether email exists.
    if (!parsed.success) return NextResponse.json({ message: "If this email exists, a reset link was sent." });
    const db = await readDB();
    const user = db.users.find((u) => u.email.toLowerCase() === parsed.data.toLowerCase());
    if (user) {
      const token = uuid().replace(/-/g, "") + uuid().replace(/-/g, "");
      await updateDB((d) => {
        d.passwordResets.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 3600000).toISOString(), used: false });
      });
      const link = `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/reset-password?token=${token}`;
      const mail = passwordResetEmail(link);
      await sendEmail(user.email, mail.subject, mail.body);
      await audit("PASSWORD_RESET_REQUESTED", { actorId: user.id, result: "ok" });
    }
    return NextResponse.json({ message: "If this email exists, a reset link was sent." });
  }
  if (body.step === "reset") {
    const parsed = passwordSchema.safeParse(body.password);
    if (!parsed.success || !body.token) return NextResponse.json({ error: "Invalid reset link or password." }, { status: 400 });
    const db = await readDB();
    const rec = db.passwordResets.find((r) => r.token === body.token && !r.used && +new Date(r.expiresAt) > Date.now());
    if (!rec) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    const hash = await hashPassword(parsed.data);
    await updateDB((d) => {
      const u = d.users.find((x) => x.id === rec.userId);
      if (u) u.passwordHash = hash;
      const r = d.passwordResets.find((x) => x.token === rec.token);
      if (r) r.used = true;
      // Optionally revoke sessions on reset:
      for (const se of d.sessions) if (se.userId === rec.userId) se.revoked = true;
    });
    await audit("PASSWORD_RESET_COMPLETED", { actorId: rec.userId, result: "ok" });
    return NextResponse.json({ ok: true });
  }
  if (body.step === "change") {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const parsed = passwordSchema.safeParse(body.newPassword);
    if (!parsed.success || !body.currentPassword) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const db = await readDB();
    const user = db.users.find((u) => u.id === s.sub);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { default: bcrypt } = await import("bcryptjs");
    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });
    const hash = await hashPassword(parsed.data);
    await updateDB((d) => {
      const u = d.users.find((x) => x.id === s.sub);
      if (u) u.passwordHash = hash;
      if (body.revokeOthers) for (const se of d.sessions) if (se.userId === s.sub && se.id !== s.sid) se.revoked = true;
    });
    await audit("PASSWORD_CHANGED", { actorId: s.sub, result: "ok" });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown step" }, { status: 400 });
}
