// DEALMAP Collector — reported-issue detector.
// Never invents defects: only flags issues EXPLICITLY mentioned in listing text.
// New module: no existing file is modified.
import type { DetectedIssue } from "./types";

interface Rule { kind: string; label: string; patterns: RegExp[]; }

const RULES: Rule[] = [
  { kind: "cracked_screen", label: "Cracked / broken screen", patterns: [/cracked?\s+screen/i, /broken\s+screen/i, /écran\s+fissuré/i, /écran\s+cassé/i, /شاشة\s+مكسورة/i] },
  { kind: "weak_battery", label: "Weak battery", patterns: [/weak\s+battery/i, /battery\s+(issue|problem|drains?)/i, /batterie\s+faible/i, /بطارية\s+ضعيفة/i] },
  { kind: "scratches", label: "Scratches / marks", patterns: [/scratch(es|ed)?\b/i, /rayures?/i, /خدوش/i] },
  { kind: "camera_issue", label: "Camera problem", patterns: [/camera\s+(issue|problem|broken|not\s+work)/i, /caméra\s+(défectueuse|ne\s+marche)/i] },
  { kind: "technical_issue", label: "Technical problem", patterns: [/not\s+working/i, /doesn.?t\s+(turn\s+on|charge|boot)/i, /ne\s+(s.?allume|charge)\s+pas/i, /ne\s+fonctionne\s+pas/i, /problème\s+technique/i] },
  { kind: "refurbished", label: "Refurbished condition", patterns: [/refurbished/i, /reconditionné/i, /rénové/i, /مجد.?د/i] },
  { kind: "no_warranty", label: "No warranty", patterns: [/no\s+warranty/i, /without\s+warranty/i, /sans\s+garantie/i, /بدون\s+ضمان/i] },
  { kind: "damaged_parts", label: "Damaged parts", patterns: [/damaged/i, /for\s+parts/i, /pour\s+pièces/i, /endommagé/i] },
];

export const NO_ISSUE_STATEMENT = "No issue reported in the available listing.";

function snippet(text: string, at: number): string {
  const s = Math.max(0, at - 40);
  return text.slice(s, at + 80).replace(/\s+/g, " ").trim().slice(0, 120);
}

export function detectProblems(text: string | null | undefined): DetectedIssue[] {
  if (!text) return [];
  const out: DetectedIssue[] = [];
  for (const rule of RULES) {
    for (const re of rule.patterns) {
      const m = re.exec(text);
      if (m) {
        out.push({ kind: rule.kind, quote: snippet(text, m.index), label: "Reported" });
        break;
      }
    }
  }
  return out;
}

export function issueLabels(issues: DetectedIssue[]): string[] {
  if (issues.length === 0) return [NO_ISSUE_STATEMENT];
  const kinds: Record<string, string> = {};
  for (const r of RULES) kinds[r.kind] = r.label;
  return issues.map((i) => `${kinds[i.kind] ?? i.kind} (reported: “${i.quote}”)`);
}
