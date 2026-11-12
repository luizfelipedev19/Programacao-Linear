// Gráfico de linha simples (SVG) com o custo médio por mês.
// pontos: [{ rotulo: 'Jun', valor: 1.92 | null }, ...]
const L = 520, A = 250, mEsq = 48, mDir = 16, mTopo = 14, mBase = 34

export function GraficoCusto({ pontos }) {
  const validos = pontos.filter((p) => p.valor !== null)
  if (validos.length < 2) {
    return <div className="vazio">Calcule pelo menos 2 formulações para ver a evolução do custo.</div>
  }

  const vals = validos.map((p) => p.valor)
  let min = Math.min(...vals), max = Math.max(...vals)
  if (max - min < 0.05) { min -= 0.05; max += 0.05 }
  const folga = (max - min) * 0.15
  min -= folga; max += folga

  const x = (i) => mEsq + (i * (L - mEsq - mDir)) / (pontos.length - 1)
  const y = (v) => mTopo + ((max - v) / (max - min)) * (A - mTopo - mBase)
  const fmt = (v) => v.toFixed(2).replace('.', ',')

  const pts = pontos.map((p, i) => (p.valor === null ? null : { x: x(i), y: y(p.valor), v: p.valor }))
  const linha = pts.filter(Boolean)
  const caminho = linha.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${caminho} L${linha[linha.length - 1].x.toFixed(1)} ${A - mBase} L${linha[0].x.toFixed(1)} ${A - mBase} Z`
  const ticks = [0, 1, 2, 3, 4].map((k) => max - ((max - min) * k) / 4)

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="grafico" role="img" aria-label="Evolução do custo por kg nos últimos 6 meses">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={mEsq} x2={L - mDir} y1={y(t)} y2={y(t)} stroke="#e6e9e7" />
          <text x={mEsq - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#5b6670">{fmt(t)}</text>
        </g>
      ))}
      <path d={area} fill="#1f8a3b" opacity=".10" />
      <path d={caminho} fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {linha.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#14532d" strokeWidth="2"><title>R$ {fmt(p.v)}</title></circle>
      ))}
      {pontos.map((p, i) => (
        <text key={p.rotulo + i} x={x(i)} y={A - 10} textAnchor="middle" fontSize="13" fill="#3a444d">{p.rotulo}</text>
      ))}
    </svg>
  )
}
