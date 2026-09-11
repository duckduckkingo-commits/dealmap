import type { MetadataRoute } from "next";
import { allProducts } from "@/lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const products = await allProducts().catch(() => []);
  return [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/explore`, lastModified: new Date() },
    { url: `${base}/search`, lastModified: new Date() },
    { url: `${base}/compare`, lastModified: new Date() },
    ...products.slice(0, 100).map((p) => ({ url: `${base}/product/${p.id}`, lastModified: new Date() })),
  ];
}
