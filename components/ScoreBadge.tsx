import type { Verdict } from "@/types";

export function verdictClass(v: Verdict): string {
  if (v === "EXCELLENT" || v === "GOOD") return "good";
  if (v === "FAIR") return "warn";
  return "bad";
}

export function verdictLabel(v: string, locale = "fr"): string {
  const map: Record<string, Record<string, string>> = {
    EXCELLENT: { en: "Excellent deal", fr: "Excellente affaire", ar: "صفقة ممتازة" },
    GOOD: { en: "Good deal", fr: "Bonne affaire", ar: "صفقة جيدة" },
    FAIR: { en: "Fair price", fr: "Prix correct", ar: "سعر مقبول" },
    EXPENSIVE: { en: "Expensive", fr: "Cher", ar: "غالي" },
    VERY_EXPENSIVE: { en: "Very expensive", fr: "Très cher", ar: "غالي جداً" },
  };
  return map[v]?.[locale] ?? map[v]?.en ?? v;
}

export function ScoreRing({ score, verdict }: { score: number | null; verdict?: string }) {
  if (score === null || score === undefined)
    return <div className="score-ring" style={{ ["--p" as string]: 0 }}><span>–</span></div>;
  const cls = score >= 75 ? "good" : score >= 55 ? "" : score >= 35 ? "warn" : "bad";
  return (
    <div className={`score-ring ${cls}`} style={{ ["--p" as string]: score }} role="img" aria-label={`Deal Score ${score} out of 100${verdict ? `, ${verdict}` : ""}`}>
      <span>{score}</span>
    </div>
  );
}

export function ScoreBadge({ score, verdict }: { score: number | null; verdict: string }) {
  if (score === null || score === undefined) {
    return <span className="badge">Not enough reliable data yet</span>;
  }
  return (
    <span className={`badge ${verdictClass(verdict as Verdict)}`} aria-label={`Deal Score ${score} out of 100, ${verdict}`}>
      {score}/100 · {verdict}
    </span>
  );
}
