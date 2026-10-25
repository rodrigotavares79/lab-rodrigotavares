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

// Fatias de pizza (preenchidas, sem furo no meio) — ao contrário do donut
// acima, que desenha um anel via stroke-dasharray.
export function pieSlices(data: { label: string; value: number; color: string }[], cx: number, cy: number, r: number) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return [];
  let cumulative = 0;
  return data.map((d) => {
    const fraction = d.value / total;
    const startAngle = cumulative * 2 * Math.PI;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI;
    const start = { x: cx + r * Math.sin(startAngle), y: cy - r * Math.cos(startAngle) };
    const end = { x: cx + r * Math.sin(endAngle), y: cy - r * Math.cos(endAngle) };
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    // Fatia única (100%): círculo completo não fecha via arco só — desenha
    // em dois semicírculos.
    const path =
      fraction >= 1
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    return { ...d, path, pct: (fraction * 100).toFixed(1) };
  });
}
