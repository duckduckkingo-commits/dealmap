import { NextResponse } from "next/server";
import { allProducts, observationsFor } from "@/lib/products";
import { dealScoreEngine } from "@/lib/dealScore";
import { track } from "@/lib/analytics";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const all = await allProducts();
  const nq = q.toLowerCase().trim();
  const items = all.filter((p) => !nq || `${p.name} ${p.brand} ${p.model}`.toLowerCase().includes(nq)).slice(0, 50);
  return NextResponse.json({ items, count: items.length });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { productId, askingPrice } = body as { productId: string; askingPrice: number };
  if (!productId || typeof askingPrice !== "number" || askingPrice <= 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const obs = await observationsFor(productId);
  const result = dealScoreEngine({ askingPrice, observations: obs });
  const s = await getSession().catch(() => null);
  await track("PRICE_CHECK", { userId: s?.sub, productId });
  return NextResponse.json(result);
}
