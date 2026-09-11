import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { readDB } from "./db";
import type { Role } from "@/types";

const COOKIE = "dealmap_session";

function secret(): string {
  return process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
}

export interface SessionPayload { sub: string; role: Role; email: string; sid: string; }

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "30d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<(SessionPayload & { name: string }) | null> {
  const jar = cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const db = await readDB();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) return null;
  const session = db.sessions.find((s) => s.id === payload.sid && !s.revoked);
  if (!session) return null;
  return { ...payload, role: user.role, name: user.name };
}

export async function requireRole(roles: Role[]): Promise<SessionPayload & { name: string }> {
  const s = await getSession();
  if (!s) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  if (!roles.includes(s.role)) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return s;
}

export const SESSION_COOKIE = COOKIE;
