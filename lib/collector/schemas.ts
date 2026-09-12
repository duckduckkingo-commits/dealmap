// DEALMAP Collector — input validation (zod). New module: no existing file is modified.
import { z } from "zod";

const httpUrl = z.string().url().max(2000).refine(
  (u) => u.startsWith("http://") || u.startsWith("https://"),
  { message: "Only http(s) product links are accepted." }
);

export const analyzeSchema = z.object({
  url: httpUrl,
});

const optText = (max: number) => z.string().max(max).optional();

export const submissionSchema = z.object({
  url: optText(2000),
  productName: optText(200),
  storeName: optText(120),
  price: z.number().positive().max(10_000_000).optional(),
  currency: z.string().max(8).optional().default("MAD"),
  condition: optText(40),
  notes: optText(2000),
});

export const submissionReviewSchema = z.object({
  action: z.enum(["verify", "reject"]),
  id: z.string().min(1).max(80),
});

export const tickSchema = z.object({
  action: z.enum(["tick"]),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

/** Weights are non-negative numbers; they are normalized to sum 100 at scoring time. */
export const weightsSchema = z.record(z.string().min(1).max(60), z.number().min(0).max(1000));
