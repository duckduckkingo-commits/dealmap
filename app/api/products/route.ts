import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";
import { track } from "@/lib/analytics";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const items = await searchProducts(q, { category: url.searchParams.get("category") || undefined });
  await track("SEARCH").catch(() => undefined);
  return NextResponse.json({ items: items.slice(0, 50), count: items.length });
}
