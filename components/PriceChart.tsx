export default function PriceChart({ series }: { series: { date: string; median: number }[] }) {
  if (!series.length) return <p style={{ color: "var(--muted)" }}>Not enough reliable data yet.</p>;
  const W = 600, H = 180, PAD = 28;
  const vals = series.map((s) => s.median);
  const max = Math.max(...vals), min = Math.min(...vals);
  const range = max - min || 1;
  const pts = series.map((s, i) => {
    const x = PAD + (i / Math.max(series.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((s.median - min) / range) * (H - PAD * 2);
    return { x, y, ...s };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;
  const last = pts[pts.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: "100%", height: "auto", display: "block" }}
        aria-label={`Price history with ${series.length} points, from ${series[0].median} to ${series[series.length - 1].median} MAD`}>
        <defs>
          <linearGradient id="dm-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="4 4" />
        ))}
        <path d={area} fill="url(#dm-area)">
          <animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" />
        </path>
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dasharray" from="0 2000" to="2000 0" dur="1.1s" fill="freeze" />
        </path>
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3} fill="var(--accent)" stroke="var(--card)" strokeWidth="2">
            <title>{`${p.date}: ${p.median} MAD`}</title>
          </circle>
        ))}
        <text x={last.x - 4} y={last.y - 12} textAnchor="end" fill="var(--accent)" fontWeight="800" fontSize="15">{last.median} MAD</text>
      </svg>
      <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: "6px 0 0" }}>{series[0].date} → {series[series.length - 1].date} · {series.length} points · min {min} · max {max} MAD</p>
    </div>
  );
}
