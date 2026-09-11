import { updateDB } from "./db";

const SENSITIVE_KEYS = ["password", "otp", "token", "secret", "service_role", "setup_secret"];

/** Append audit event without ever storing secrets. */
export async function audit(action: string, opts: { actorId?: string; target?: string; result?: string; metadata?: Record<string, unknown> } = {}): Promise<void> {
  const safeMeta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(opts.metadata ?? {})) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) continue;
    safeMeta[k] = v;
  }
  const id = `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await updateDB((db) => {
    db.audit.push({
      id, actorId: opts.actorId, action,
      target: opts.target, result: opts.result ?? "ok",
      metadata: safeMeta, createdAt: new Date().toISOString(),
    });
  });
}
