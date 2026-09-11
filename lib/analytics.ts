import { updateDB } from "./db";

export async function track(event: string, opts: { userId?: string; productId?: string } = {}): Promise<void> {
  const id = `an_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  await updateDB((db) => {
    db.analytics.push({ id, event, userId: opts.userId, productId: opts.productId, createdAt: new Date().toISOString() });
  }).catch(() => undefined);
}
