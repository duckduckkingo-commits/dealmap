// DEALMAP Collector — Supabase PostgREST access WITHOUT new dependencies.
// Uses built-in fetch against the Supabase REST API. Active only when the
// service key + URL are configured; otherwise the local JSON store is used.
// New module: no existing file is modified.

function base(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return url.replace(/\/$/, "");
}

export function isPg(): boolean {
  return base() !== null;
}

function headers(): Record<string, string> {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function pgSelect<T>(table: string, query = "select=*&limit=500"): Promise<T[] | null> {
  const b = base();
  if (!b) return null;
  try {
    const res = await fetch(`${b}/rest/v1/${table}?${query}`, { headers: headers() });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export async function pgUpsert(table: string, rows: Record<string, unknown>[], onConflict: string): Promise<boolean> {
  const b = base();
  if (!b) return false;
  try {
    const res = await fetch(`${b}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: { ...headers(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    return res.ok;
  } catch {
    return false;
  }
}
