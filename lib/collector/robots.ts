// DEALMAP Collector — robots.txt compliance.
// Automated re-checks run ONLY where the site's robots rules allow.
// Single user-pasted URLs (explicit user direction, like a link preview)
// are not mass crawling and stay outside this gate.
// New module: no existing file is modified.

interface Group { agents: string[]; rules: { allow: boolean; path: string }[]; }

export function parseRobots(txt: string): Group[] {
  const groups: Group[] = [];
  let cur: Group = { agents: [], rules: [] };
  for (const raw of txt.split("\n")) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const ua = /^user-agent\s*:\s*(.+)$/i.exec(line);
    if (ua) {
      if (cur.agents.length && cur.rules.length) { groups.push(cur); cur = { agents: [], rules: [] }; }
      else if (cur.agents.length && !cur.rules.length) { /* same group, another agent */ }
      else if (groups.length && cur.agents.length === 0 && cur.rules.length === 0) { /* keep */ }
      cur.agents.push(ua[1].trim().toLowerCase());
      continue;
    }
    const rule = /^(allow|disallow)\s*:\s*(.*)$/i.exec(line);
    if (rule) {
      // A new group starts when rules already collected and a fresh agent line came;
      // consecutive rules belong to the current group.
      cur.rules.push({ allow: rule[1].toLowerCase() === "allow", path: rule[2].trim() });
    }
  }
  if (cur.agents.length) groups.push(cur);
  return groups;
}

/** Longest-match wins; Allow wins ties; empty Disallow = allow all. */
export function pathAllowed(groups: Group[], path: string): boolean {
  const g = groups.find((x) => x.agents.includes("*")) ?? groups[0];
  if (!g) return true;
  let best: { allow: boolean; len: number } | null = null;
  for (const r of g.rules) {
    if (!r.path) return true; // "Disallow:" empty means allow everything
    if (r.path === "/" && path.startsWith("/")) {
      if (!best || 1 >= best.len) best = { allow: r.allow, len: 1 };
      continue;
    }
    if (r.path !== "/" && path.startsWith(r.path)) {
      if (!best || r.path.length >= best.len) best = { allow: r.allow, len: r.path.length };
    }
  }
  return best ? best.allow : true;
}

const cache = new Map<string, { at: number; txt: string }>();

/** Returns {ok, note}. Network failures default to NOT allowed (fail closed). */
export async function robotsAllows(pageUrl: string): Promise<{ ok: boolean; note: string }> {
  let u: URL;
  try { u = new URL(pageUrl); } catch { return { ok: false, note: "Invalid URL." }; }
  if (isPrivateHost(u.hostname)) return { ok: false, note: "Private host." };
  const origin = `${u.protocol}//${u.host}`;
  let txt = cache.get(origin)?.txt;
  if (!txt || Date.now() - (cache.get(origin)?.at ?? 0) > 3600000) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${origin}/robots.txt`, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DEALMAP-link-analysis)" },
      });
      clearTimeout(t);
      if (res.status === 404) return { ok: true, note: "No robots.txt — no rule against polite fetching." };
      if (!res.ok) return { ok: false, note: `robots.txt HTTP ${res.status} — treating as disallow (fail closed).` };
      txt = await res.text();
      cache.set(origin, { at: Date.now(), txt });
    } catch {
      return { ok: false, note: "robots.txt unreachable — treating as disallow (fail closed)." };
    }
  }
  const ok = pathAllowed(parseRobots(txt), u.pathname || "/");
  return ok ? { ok: true, note: "Allowed by robots.txt." } : { ok: false, note: "Disallowed by robots.txt — skipped." };
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = +m[1], b = +m[2];
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}
