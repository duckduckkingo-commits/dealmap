// /api/collector/weights — deal-score weights (GET open, PUT admin).
// New route. Reuses role gating. Modifies nothing existing.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { weightsSchema } from "@/lib/collector/schemas";
import { FACTORS, getWeights, saveWeights } from "@/lib/smartdeal/weights";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ factors: FACTORS, weights: await getWeights() });
}

export async function PUT(req: Request) {
  try {
    await requireRole(["ADMIN", "OWNER"]);
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 403;
    return NextResponse.json({ error: "Forbidden — ADMIN or OWNER only." }, { status });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = weightsSchema.safeParse(body.weights ?? body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid weights." }, { status: 400 });
  return NextResponse.json({ weights: await saveWeights(parsed.data) });
}
