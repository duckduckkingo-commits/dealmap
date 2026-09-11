import { z } from "zod";

export const emailSchema = z.string().email().max(254);
export const passwordSchema = z.string().min(8).max(128);
export const nameSchema = z.string().trim().min(1).max(80);

export const registerSchema = z.object({
  name: nameSchema, email: emailSchema, password: passwordSchema,
});
export const loginSchema = z.object({
  email: emailSchema, password: z.string().min(1).max(128),
});
export const setupSchema = z.object({
  name: nameSchema, email: emailSchema, password: passwordSchema,
  setupSecret: z.string().max(256).optional().default(""),
});
export const priceSchema = z.number().positive().max(100_000_000);
export const contributeSchema = z.object({
  productId: z.string().min(1).max(64),
  price: priceSchema,
  currency: z.string().length(3).default("MAD"),
  condition: z.enum(["new", "like_new", "used_good", "used_fair", "refurbished"]).default("used_good"),
  location: z.string().max(80).default("Casablanca"),
  sellerType: z.enum(["individual", "store", "marketplace", "official"]).default("individual"),
});
export const watchlistSchema = z.object({
  productId: z.string().min(1).max(64),
  targetPrice: z.number().positive().max(100_000_000).optional(),
  targetScore: z.number().min(0).max(100).optional(),
});
export const alertSchema = z.object({
  productId: z.string().min(1).max(64),
  type: z.enum(["price_below", "score_above", "price_drop", "availability"]),
  targetPrice: z.number().positive().max(100_000_000).optional(),
  targetScore: z.number().min(0).max(100).optional(),
});
export const purchaseSchema = z.object({
  productId: z.string().min(1).max(64),
  price: priceSchema,
  date: z.string().max(32),
  seller: z.string().max(120).optional(),
  store: z.string().max(120).optional(),
  serialNumber: z.string().max(120).optional(),
  warrantyMonths: z.number().int().min(0).max(120).optional(),
  returnDeadline: z.string().max(32).optional(),
  notes: z.string().max(2000).optional(),
});

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}
export function assertSafePath(name: string): void {
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("Unsafe file name");
  }
}

export const ALLOWED_RECEIPT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
