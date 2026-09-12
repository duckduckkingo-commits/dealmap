// DEALMAP Collector — source adapters.
// Only ToS-friendly collection:
//  - the single product URL the USER pasted (user-directed, plain fetch, no JS rendering),
//  - user-submitted deals,
//  - an admin-curated store directory (names + homepages only — never fabricated prices).
// No protection bypass, no credential use, no mass scraping.
// New module: no existing file is modified.
import { labeled, unknown, type Labeled } from "./labels";
import { detectProblems } from "./problems";
import type { Availability, Condition, ExtractedListing, Store } from "./types";

/** Blocks localhost / private ranges / cloud metadata (basic SSRF guard). */
export function isBlockedHostname(hostname: string): boolean {  const h = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

/** Admin-curated directory: real retailer names + homepages. Prices are NEVER stored here. */
export const STORE_DIRECTORY: Omit<Store, "reliability" | "allowRecheck">[] = [
  { id: "store_jumia_ma", name: "Jumia Morocco", homepage: "https://www.jumia.ma", country: "MA" },
  { id: "store_marjanemall", name: "Marjane Mall (bot-walled, CSV only)", homepage: "https://www.marjanemall.ma", country: "MA" },
  { id: "store_electroplanet", name: "Electroplanet (bot-walled, CSV only)", homepage: "https://www.electroplanet.ma", country: "MA" },
  { id: "store_virgin_ma", name: "Virgin Megastore Morocco", homepage: "https://www.virginmegastore.ma", country: "MA" },
  { id: "store_amazon", name: "Amazon", homepage: "https://www.amazon.com", country: "INTL" },
  { id: "store_fnac", name: "Fnac", homepage: "https://www.fnac.com", country: "INTL" },
  { id: "store_apple", name: "Apple Store", homepage: "https://www.apple.com", country: "INTL" },
  { id: "store_samsung_ma", name: "Samsung Morocco (bot-walled, CSV only)", homepage: "https://shop.samsung.com/morocco", country: "MA" },
];

const KNOWN_BRANDS = ["apple", "samsung", "xiaomi", "redmi", "poco", "huawei", "honor", "oppo", "vivo", "realme", "oneplus", "nothing", "google", "pixel", "sony", "lenovo", "hp", "dell", "asus", "acer", "msi", "nvidia", "canon", "nikon", "jbl", "anker", "tecno", "infinix"];

function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]+itemprop=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m) return m[1].trim().slice(0, 300) || null;
  }
  return null;
}

function jsonLdProducts(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const t = rec["@type"];
          const types = Array.isArray(t) ? t : [t];
          if (types.includes("Product")) out.push(rec);
          if (Array.isArray(rec["@graph"])) {
            for (const g of rec["@graph"] as Record<string, unknown>[]) {
              const gt = g["@type"];
              const gtypes = Array.isArray(gt) ? gt : [gt];
              if (g && typeof g === "object" && gtypes.includes("Product")) out.push(g);
            }
          }
        }
      }
    } catch { /* malformed JSON-LD is ignored — never guessed from */ }
  }
  return out;
}

function num(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/[^0-9.,]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickOffer(offers: unknown): Record<string, unknown> | null {
  const arr = Array.isArray(offers) ? offers : [offers];
  for (const o of arr) {
    if (o && typeof o === "object" && (o as Record<string, unknown>).price !== undefined) {
      return o as Record<string, unknown>;
    }
  }
  return null;
}

function detectCondition(text: string): { condition: Condition; raw: string | null; label: "Reported" | "Unknown" } {
  const checks: [RegExp, Condition][] = [
    [/\breconditionné\b|\brefurbished\b|\brénové\b|\brenewed\b|\bremis\s+à\s+neuf\b/i, "refurbished"],
    [/\boccasion\b|\bused\b|\bsecond[- ]?hand\b|\bmستعمل/i, "used"],
    [/\bneuf\b|\bnew\b|\bجديد/i, "new"],
  ];
  for (const [re, c] of checks) {
    const m = re.exec(text);
    if (m) return { condition: c, raw: m[0], label: "Reported" };
  }
  return { condition: "unknown", raw: null, label: "Unknown" };
}

function detectWarranty(text: string): number | null {
  const m = /garantie\s*(?:de\s*)?(\d{1,2})\s*(mois|months?|ans?|years?)/i.exec(text)
    || /(\d{1,2})\s*(month|year)s?\s*warranty/i.exec(text)
    || /ضمان\s*(\d{1,2})\s*(شهر|سنة|أشهر|سنوات)/.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const months = unit.startsWith("an") || unit.startsWith("year") || unit.startsWith("سنة") || unit.startsWith("سنوات") || unit === "a" ? n * 12 : n;
  return months >= 1 && months <= 120 ? months : null;
}

function detectSpecs(text: string): { ramGB: number | null; storageGB: number | null } {
  const ram = /(\d{1,2})\s?\s?GB?\s?(RAM|mémoire|ذاكرة)/i.exec(text);
  const sto = /(stockage|storage|ROM|SSD|NVMe|disque)?\s*:?\s?(64|128|256|512|1024|2048)\s?GB?/i.exec(text);
  const ramGB = ram ? Number(ram[1]) : null;
  const storageGB = sto ? Number(sto[2]) : null;
  return {
    ramGB: ramGB !== null && ramGB >= 1 && ramGB <= 64 ? ramGB : null,
    storageGB: storageGB !== null ? storageGB : null,
  };
}

function detectEan(text: string): string | null {
  const m = /\b(\d{12,14})\b/.exec(text.replace(/[\s-]/g, " "));
  return m ? m[1] : null;
}

export interface FetchResult { html: string; note: string; }

export async function fetchPage(url: string, timeoutMs = 8000): Promise<FetchResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DEALMAP-link-analysis; +https://dealmap.example/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { html: "", note: `Page returned HTTP ${res.status} — content treated as Unknown.` };
    const ctype = res.headers.get("content-type") ?? "";
    if (!/html/i.test(ctype)) return { html: "", note: `Non-HTML content (${ctype}) — content treated as Unknown.` };
    const html = (await res.text()).slice(0, 500_000);
    return { html, note: "Fetched once for analysis." };
  } catch (e) {
    return { html: "", note: `Fetch failed (${e instanceof Error ? e.message : "network error"}) — content treated as Unknown.` };
  } finally {
    clearTimeout(t);
  }
}

/** Extracts a listing from ONE user-pasted URL. Missing data stays Unknown — never invented. */
export async function extractListing(url: string): Promise<ExtractedListing> {
  const { html, note } = await fetchPage(url);
  return extractFromHtml(url, html, note);
}

/** Pure HTML → listing extraction (testable). Product photo from og:image / JSON-LD. */
export function extractFromHtml(url: string, html: string, note: string): ExtractedListing {
  const missing: string[] = [];
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const lds = html ? jsonLdProducts(html) : [];
  const ld = lds[0] as Record<string, unknown> | undefined;
  const ldOffer = ld ? pickOffer(ld.offers) : null;

  const ldName = typeof ld?.name === "string" ? ld.name : null;
  const ogTitle = meta(html, "og:title");
  const titleTag = /<title[^>]*>([^<]{1,300})<\/title>/i.exec(html)?.[1]?.trim() ?? null;
  const name = ldName ?? ogTitle ?? titleTag;

  const ldPrice = ldOffer ? num(String(ldOffer.price ?? "")) : null;
  const metaPrice = num(meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? meta(html, "price"));
  const priceVal = ldPrice ?? metaPrice;
  const currency = (typeof ldOffer?.priceCurrency === "string" && (ldOffer.priceCurrency as string)) || meta(html, "product:price:currency") || "MAD";

  const brandRaw = (typeof ld?.brand === "object" && ld.brand !== null ? (ld.brand as Record<string, unknown>).name : ld?.brand) as unknown;
  const brandStr = typeof brandRaw === "string" ? brandRaw : meta(html, "og:brand") ?? meta(html, "product:brand");
  let brand: string | null = brandStr ?? null;
  if (!brand && name) {
    const low = name.toLowerCase();
    brand = KNOWN_BRANDS.find((b) => low.includes(b)) ?? null;
    if (brand) brand = brand.charAt(0).toUpperCase() + brand.slice(1);
  }

  const model = (typeof ld?.model === "string" && (ld.model as string)) || (typeof ld?.mpn === "string" && (ld.mpn as string)) || null;
  const specs = detectSpecs(`${name ?? ""} ${text.slice(0, 20000)}`);
  const ean = detectEan(`${typeof ld?.gtin === "string" ? (ld.gtin as string) : ""} ${text.slice(0, 20000)}`);
  const cond = detectCondition(text.slice(0, 30000));
  const warranty = detectWarranty(text.slice(0, 30000));
  const availRaw = (typeof ldOffer?.availability === "string" ? (ldOffer.availability as string) : "") + " " + (meta(html, "og:availability") ?? "");
  const availability: Availability = /InStock/i.test(availRaw) ? "in_stock" : /OutOfStock|SoldOut/i.test(availRaw) ? "out_of_stock" : /PreOrder/i.test(availRaw) ? "preorder" : "unknown";
  let host = "unknown source";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep default */ }

  // Product photo: JSON-LD image first, then og:image. Relative URLs resolved.
  const ldImageRaw = ld ? (Array.isArray(ld.image) ? ld.image[0] : ld.image) : null;
  const ldImage = typeof ldImageRaw === "string" ? ldImageRaw : (ldImageRaw && typeof ldImageRaw === "object" ? (ldImageRaw as Record<string, unknown>).url : null);
  const ogImage = meta(html, "og:image");
  const imageRaw = (typeof ldImage === "string" && ldImage) || ogImage;
  let image: string | null = null;
  if (imageRaw) {
    try { image = new URL(imageRaw, url).toString().slice(0, 1000); } catch { image = null; }
    if (image && !/^https?:\/\//i.test(image)) image = null;
  }

  const issues = detectProblems(text.slice(0, 60000));
  const field = <T,>(v: T | null, label: "Verified" | "Reported" | "Estimated", missingName?: string): Labeled<T> => {
    if (v === null || v === undefined || v === "") {
      if (missingName) missing.push(missingName);
      return unknown<T>();
    }
    return labeled(v, label);
  };

  return {
    url,
    name: field(name, "Reported", "product name"),
    brand: field(brand, brandStr ? "Reported" : "Estimated", "brand"),
    model: field(model, "Reported", "model / variant"),
    ramGB: field(specs.ramGB, "Reported", "RAM"),
    storageGB: field(specs.storageGB, "Reported", "storage"),
    ean: field(ean, "Reported", "EAN/GTIN"),
    modelNumber: field(model, "Reported"),
    price: field(priceVal, ldPrice ? "Reported" : "Estimated", "price"),
    currency,
    condition: cond.label === "Unknown" ? (() => { missing.push("condition"); return unknown<Condition>(); })() : labeled(cond.condition, "Reported"),
    conditionRaw: cond.raw,
    warrantyMonths: field(warranty, "Reported", "warranty"),
    availability: availability === "unknown" ? (() => { missing.push("availability"); return unknown<Availability>(); })() : labeled(availability, "Reported"),
    storeName: labeled(host, "Reported"),
    image: field(image, "Reported", "product photo"),
    issues,
    missing,
    fetchedAt: new Date().toISOString(),
    fetchNote: note,
  };
}
