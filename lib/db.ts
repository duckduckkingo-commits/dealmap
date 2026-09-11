import { promises as fs } from "fs";
import path from "path";
import type { AlertItem, AuditEvent, Contribution, NotificationItem, PriceObservation, Product, Purchase, ReturnItem, UserProfile, Warranty, WatchlistItem } from "@/types";

export interface DBShape {
  users: (UserProfile & { passwordHash: string; verified: boolean })[];
  products: Product[];
  observations: PriceObservation[];
  watchlists: WatchlistItem[];
  alerts: AlertItem[];
  purchases: Purchase[];
  warranties: Warranty[];
  returns: ReturnItem[];
  contributions: Contribution[];
  notifications: NotificationItem[];
  audit: AuditEvent[];
  reports: { id: string; userId: string; targetType: string; targetId: string; reason: string; status: string; createdAt: string }[];
  settings: Record<string, string>;
  analytics: { id: string; event: string; userId?: string; productId?: string; createdAt: string }[];
  sessions: { id: string; userId: string; createdAt: string; userAgent?: string; revoked: boolean }[];
  categories: { id: string; slug: string; name: string }[];
  passwordResets: { token: string; userId: string; expiresAt: string; used: boolean }[];
  receipts: { id: string; userId: string; purchaseId?: string; fileName: string; mime: string; size: number; dataBase64: string; createdAt: string }[];
}

const DB_FILE = path.join(process.cwd(), "data", "db.json");

const EMPTY: DBShape = {
  users: [], products: [], observations: [], watchlists: [], alerts: [],
  purchases: [], warranties: [], returns: [], contributions: [],
  notifications: [], audit: [], reports: [], settings: {},
  analytics: [], sessions: [], categories: [], passwordResets: [], receipts: [],
};

async function ensureDir() {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
}

/** Simple file-backed store for local/dev. Production uses Supabase Postgres (see supabase/migrations). */
export async function readDB(): Promise<DBShape> {
  try {
    await ensureDir();
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DBShape>;
    return { ...EMPTY, ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

// In-memory mutex + atomic write to reduce race conditions (e.g. concurrent /setup).
let writeLock: Promise<void> = Promise.resolve();

export async function writeDB(db: DBShape): Promise<void> {
  const task = writeLock.then(async () => {
    await ensureDir();
    const tmp = DB_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_FILE);
  });
  writeLock = task.catch(() => undefined);
  await task;
}

export async function updateDB(fn: (db: DBShape) => void | Promise<void>): Promise<DBShape> {
  let result!: DBShape;
  const task = writeLock.then(async () => {
    await ensureDir();
    let db: DBShape;
    try {
      const raw = await fs.readFile(DB_FILE, "utf8");
      db = { ...EMPTY, ...(JSON.parse(raw) as Partial<DBShape>) };
    } catch {
      db = structuredClone(EMPTY);
    }
    await fn(db);
    const tmp = DB_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, DB_FILE);
    result = db;
  });
  writeLock = task.catch(() => undefined);
  await task;
  return result;
}

export function usesSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
