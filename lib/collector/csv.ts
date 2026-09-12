// DEALMAP Collector — CSV import for real price lists the admin has rights to.
// Format per line: storeName, url, price, currency?, condition?, availability?
// (availability: in_stock / out_of_stock, default unknown → hidden until verified).
// Delimiter: comma or semicolon. Lines starting with # are ignored.
// Invalid lines are reported, never silently stored.
// New module: no existing file is modified.

export interface CsvRow {
  line: number;
  storeName: string;
  url: string;
  price: number;
  currency: string;
  condition: string;
  availability: string;
}

export interface CsvResult {
  rows: CsvRow[];
  rejected: { line: number; reason: string }[];
}

function split(line: string): string[] {
  const delim = line.includes(";") ? ";" : ",";
  // Minimal quoted-field support.
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === delim && !quoted) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseCsv(text: string): CsvResult {
  const rows: CsvRow[] = [];
  const rejected: { line: number; reason: string }[] = [];
  text.split("\n").forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const cells = split(line);
    // Skip a header row.
    if (idx === 0 && /store/i.test(cells[0] ?? "") && /url|link/i.test(cells[1] ?? "")) return;
    const [storeName = "", url = "", priceRaw = "", currency = "MAD", condition = "", availability = ""] = cells;
    if (!storeName) return rejected.push({ line: lineNo, reason: "Missing store name." });
    if (!/^https?:\/\//i.test(url)) return rejected.push({ line: lineNo, reason: "URL must start with http(s)://" });
    const price = Number(String(priceRaw).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(price) || price <= 0) return rejected.push({ line: lineNo, reason: "Price must be a positive number." });
    const avail = availability.trim().toLowerCase().replace(/[\s_]+/g, "_");
    const availabilityOut = avail === "in_stock" || avail === "out_of_stock" ? avail : "";
    rows.push({ line: lineNo, storeName: storeName.slice(0, 120), url: url.slice(0, 2000), price, currency: (currency || "MAD").slice(0, 8).toUpperCase(), condition: condition.slice(0, 40), availability: availabilityOut });
  });
  return { rows, rejected };
}
