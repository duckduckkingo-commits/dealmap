// DEALMAP Collector — shared shapes. New module: no existing file is modified.
import type { InfoLabel, Labeled } from "./labels";

export type Availability = "in_stock" | "out_of_stock" | "preorder" | "unknown";
export type Condition = "new" | "used" | "refurbished" | "unknown";
export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";
export type MatchMethod = "ean" | "model_number" | "brand_model_specs" | "fuzzy" | "none";

export interface StoreSpec {
  brand?: string; model?: string; ramGB?: number; storageGB?: number;
  ean?: string; modelNumber?: string;
}

export interface Store {
  id: string;
  name: string;
  homepage: string;
  country: string;
  /** 0..1 when known from track record. Null = Unknown (never invented). */
  reliability: number | null;
  /** Mass re-checking is OFF unless an admin explicitly allows it for a source. */
  allowRecheck: boolean;
  notes?: string;
}

export interface Offer {
  id: string;
  productRef: string | null;
  productName: string | null;
  storeId: string | null;
  storeName: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string | null;
  price: number | null;
  currency: string;
  oldPrice?: number | null;
  discountPct?: number | null;
  ratingValue?: number | null;
  reviewsCount?: number | null;
  seller?: string | null;
  location?: string | null;
  imageOk?: boolean;
  availability: Availability;
  availabilityLabel: InfoLabel;
  condition: Condition;
  conditionLabel: InfoLabel;
  warrantyMonths: number | null;
  warrantyLabel: InfoLabel;
  returnPolicy: string | null;
  returnPolicyLabel?: InfoLabel;
  category?: string | null;
  specs: StoreSpec;
  verificationStatus: VerificationStatus;
  lastChecked: string | null;
  createdAt: string;
}

export interface PricePoint {
  productRef: string;
  offerId?: string;
  price: number;
  at: string;
}

export interface CollectionRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "ok" | "partial" | "failed";
  checked: number;
  updated: number;
  skipped: number;
  failedSources: string[];
  errors: string[];
  /** Non-error notes, e.g. "Skipped: disallowed by robots.txt". */
  notes: string[];
}

export interface UserSubmission {
  id: string;
  url: string | null;
  productName: string | null;
  storeName: string | null;
  price: number | null;
  currency: string;
  condition: string | null;
  notes: string | null;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
}

export interface DetectedIssue {
  kind: string;
  quote: string;
  label: Extract<InfoLabel, "Reported">;
}

export interface ExtractedListing {
  url: string;
  name: Labeled<string>;
  brand: Labeled<string>;
  model: Labeled<string>;
  ramGB: Labeled<number>;
  storageGB: Labeled<number>;
  ean: Labeled<string>;
  modelNumber: Labeled<string>;
  price: Labeled<number>;
  currency: string;
  condition: Labeled<Condition>;
  conditionRaw: string | null;
  warrantyMonths: Labeled<number>;
  availability: Labeled<Availability>;
  storeName: Labeled<string>;
  image: Labeled<string>;
  issues: DetectedIssue[];
  missing: string[];
  fetchedAt: string;
  fetchNote: string;
}

export interface MatchCandidate {
  ref: string;
  name: string;
  brand?: string;
  model?: string;
  ramGB?: number;
  storageGB?: number;
  ean?: string;
  modelNumber?: string;
}

export interface MatchResult {
  method: MatchMethod;
  confidence: number;
  productRef: string | null;
  productName: string | null;
  notes: string[];
}
