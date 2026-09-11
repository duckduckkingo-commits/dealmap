export type Role = "USER" | "ADMIN" | "OWNER";
export type Condition = "new" | "like_new" | "used_good" | "used_fair" | "refurbished";
export type SellerType = "individual" | "store" | "marketplace" | "official";
export type SourceType = "user_report" | "listing" | "purchase" | "partner_feed" | "admin_entry";
export type DataQuality = "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type Verdict = "EXCELLENT" | "GOOD" | "FAIR" | "EXPENSIVE" | "VERY_EXPENSIVE" | "INSUFFICIENT_DATA";

export interface Category { id: string; slug: string; name: Record<string, string>; }
export interface Brand { id: string; slug: string; name: string; aliases: string[]; }
export interface Product {
  id: string; brandId: string; brand: string; model: string; name: string;
  categoryId: string; category: string; specs: Record<string, string>;
  image?: string; createdAt: string; updatedAt: string;
}
export interface ProductVariant {
  id: string; productId: string; label: string;
  storage?: string; ram?: string; color?: string;
}
export interface PriceObservation {
  id: string; productId: string; variantId?: string;
  price: number; currency: string; condition: Condition;
  sellerType: SellerType; location: string; sourceType: SourceType;
  observedAt: string; createdAt: string;
  quality: DataQuality; verificationStatus: "pending" | "verified" | "rejected" | "flagged";
  contributorId?: string; isDemo?: boolean;
}
export interface DealScoreResult {
  score: number; verdict: Verdict;
  marketRange: { min: number; max: number } | null;
  referencePrice: number | null; confidence: Confidence;
  sampleSize: number; reasons: string[]; version: string;
}
export interface UserProfile {
  id: string; email: string; name: string; role: Role;
  createdAt: string; reputation: number; language: string;
  theme: string; accent: string;
}
export interface WatchlistItem {
  id: string; userId: string; productId: string; variantId?: string;
  targetPrice?: number; targetScore?: number; createdAt: string;
}
export interface AlertItem {
  id: string; userId: string; productId: string;
  type: "price_below" | "score_above" | "price_drop" | "availability";
  targetPrice?: number; targetScore?: number; active: boolean;
  expiresAt?: string; createdAt: string; triggeredAt?: string;
}
export interface Purchase {
  id: string; userId: string; productId: string; variantId?: string;
  price: number; currency: string; date: string; seller?: string; store?: string;
  serialNumber?: string; warrantyMonths?: number; returnDeadline?: string;
  notes?: string; receiptId?: string; createdAt: string;
}
export interface Warranty { id: string; userId: string; purchaseId: string; productId: string; startDate: string; endDate: string; seller?: string; notes?: string; }
export interface ReturnItem { id: string; userId: string; purchaseId: string; deadline: string; status: "pending" | "returned" | "expired" | "kept"; seller?: string; notes?: string; }
export interface Contribution { id: string; userId: string; productId: string; price: number; currency: string; condition: Condition; sourceType: SourceType; location: string; createdAt: string; status: "pending" | "approved" | "rejected"; }
export interface NotificationItem { id: string; userId: string; kind: string; title: string; body: string; read: boolean; createdAt: string; }
export interface AuditEvent { id: string; actorId?: string; action: string; target?: string; result: string; metadata?: Record<string, unknown>; createdAt: string; }
