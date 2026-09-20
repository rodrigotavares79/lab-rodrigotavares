// Helpers de desenho SVG compartilhados entre os dashboards (Gestão de
// Riscos e Governança de IA) — linha/área pra séries no tempo, donut pra
// distribuição categórica.

export function linePath(values: number[], w: number, h: number, max: number) {
  const n = values.length;
  if (n === 0) return "";
  if (n === 1) return `M 0 ${h - (values[0] / max) * h} L ${w} ${h - (values[0] / max) * h}`;
  return values
    .map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function areaPath(values: number[], w: number, h: number, max: number) {
  const line = linePath(values, w, h, max);
  if (!line) return "";
  return `${line} L ${w} ${h} L 0 ${h} Z`;
}

export function donutSegments(data: { label: string; value: number; color: string }[], r: number) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return [];
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  return data.map((d) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const offset = -cumulative * circumference;
    cumulative += fraction;
    return { ...d, dash, gap: circumference - dash, offset, pct: (fraction * 100).toFixed(1) };
  });
}
