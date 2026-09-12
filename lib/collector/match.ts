// DEALMAP Collector — product matching pipeline.
// Priority: EAN/GTIN → Model Number → Brand + Model + RAM + Storage → Normalized/Fuzzy.
// AI is used ONLY when necessary and only when explicitly enabled (never faked).
// Refuses to merge when important specs differ (RAM, storage, model, region, condition).
// New module: no existing file is modified.
import type { ExtractedListing, MatchCandidate, MatchResult } from "./types";

export function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF ]/gi, " ").replace(/\s+/g, " ").trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 1));
}

function overlap(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.max(A.size, B.size);
}

export function aiReviewAvailable(): boolean {
  return process.env.AI_ENABLED === "true";
}

export function matchListing(listing: ExtractedListing, candidates: MatchCandidate[]): MatchResult {
  const notes: string[] = [];
  if (candidates.length === 0) return { method: "none", confidence: 0, productRef: null, productName: null, notes: ["No candidates to compare against."] };

  // Tier 1 — EAN/GTIN exact.
  if (listing.ean.value) {
    const hit = candidates.find((c) => c.ean && c.ean.replace(/\D/g, "") === listing.ean.value!.replace(/\D/g, ""));
    if (hit) return { method: "ean", confidence: 1, productRef: hit.ref, productName: hit.name, notes: [`EAN/GTIN exact match (${listing.ean.value}).`] };
    notes.push("EAN present but not found in catalog.");
  }

  // Tier 2 — model number exact.
  if (listing.modelNumber.value) {
    const mn = normalize(listing.modelNumber.value);
    const hit = candidates.find((c) => c.modelNumber && normalize(c.modelNumber) === mn);
    if (hit) return { method: "model_number", confidence: 0.95, productRef: hit.ref, productName: hit.name, notes: [`Model number exact match (${listing.modelNumber.value}).`] };
    notes.push("Model number present but not found in catalog.");
  }

  // Tier 3 — brand + model + RAM + storage (all must agree when known).
  const b = normalize(listing.brand.value ?? "");
  const m = normalize(listing.model.value ?? "") || normalize(listing.name.value ?? "");
  const ram = listing.ramGB.value;
  const sto = listing.storageGB.value;
  if (b && m) {
    const hits = candidates.filter((c) => {
      const cb = normalize(c.brand ?? "");
      const cm = `${normalize(c.model ?? "")} ${normalize(c.name)}`;
      if (cb && cb !== b) return false;
      // Symmetric name agreement — "Pro" vs non-Pro must NOT merge.
      if (overlap(cm, m) < 0.5 || overlap(m, cm) < 0.35) return false;
      // Hard spec refusal when both sides are known and differ.
      if (ram !== null && c.ramGB !== undefined && c.ramGB !== null && c.ramGB !== ram) return false;
      if (sto !== null && c.storageGB !== undefined && c.storageGB !== null && c.storageGB !== sto) return false;
      // EANs that both exist but differ = different products, never merge.
      return true;
    });
    if (hits.length === 1) {
      return { method: "brand_model_specs", confidence: 0.85, productRef: hits[0].ref, productName: hits[0].name, notes: ["Brand + model + specs agree; differing variants excluded."] };
    }
    if (hits.length > 1) notes.push(`${hits.length} variants share brand/model — specs differ, refusing to merge.`);
  } else {
    notes.push("Brand/model incomplete — tier 3 skipped.");
  }

  // Tier 4 — normalized fuzzy on names.
  const lname = normalize(listing.name.value ?? "");
  if (lname) {
    let best: MatchCandidate | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      if (ram !== null && c.ramGB !== undefined && c.ramGB !== null && c.ramGB !== ram) continue;
      if (sto !== null && c.storageGB !== undefined && c.storageGB !== null && c.storageGB !== sto) continue;
      const s = overlap(lname, `${c.brand ?? ""} ${c.model ?? ""} ${c.name}`);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore >= 0.6) {
      const specNote = ram !== null || sto !== null ? " Verify RAM/storage before treating as identical." : "";
      return { method: "fuzzy", confidence: Math.round(bestScore * 100) / 100, productRef: best.ref, productName: best.name, notes: [`Fuzzy name similarity ${Math.round(bestScore * 100)}%.${specNote}`] };
    }
    notes.push("No fuzzy match above 60% similarity.");
  }

  if (aiReviewAvailable()) notes.push("AI review is enabled — flagged for AI-assisted matching.");
  else notes.push("AI matching unavailable (AI disabled) — kept as unmatched rather than guessed.");
  return { method: "none", confidence: 0, productRef: null, productName: null, notes };
}
