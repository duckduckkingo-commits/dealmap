import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";

export async function GET() {
  let dbOk = true;
  try { await readDB(); } catch { dbOk = false; }
  return NextResponse.json({ status: "ok", app: true, db: dbOk, time: new Date().toISOString() });
}
