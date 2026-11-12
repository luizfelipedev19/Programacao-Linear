import { useEffect, useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { GraficoCusto } from '../components/GraficoCusto'
import { useAvisos } from '../components/Avisos'
import { buscarRelatorio, getUsuario } from '../services/api'
import { brl, pct } from '../services/formatos'

const periodos = [
  { id: 'tudo', rotulo: 'Todo o período', dias: null },
  { id: '30', rotulo: 'Últimos 30 dias', dias: 30 },
  { id: '90', rotulo: 'Últimos 90 dias', dias: 90 },
]
const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const num = (v, casas = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const diaMes = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function Relatorios({ aoSair, aoNavegar, aoAbrir }) {
  const avisos = useAvisos()
  const [dados, setDados] = useState(null)
  const [periodo, setPeriodo] = useState('tudo')

  useEffect(() => {
    buscarRelatorio().then(setDados).catch((e) => { setDados({ total: 0, itens: [] }); avisos.erro(e.message) })
  }, [])

  const rotuloPeriodo = periodos.find((p) => p.id === periodo).rotulo

  // formulações dentro do período escolhido
  const itens = useMemo(() => {
    const dias = periodos.find((p) => p.id === periodo).dias
    const limite = dias ? Date.now() - dias * 24 * 3600 * 1000 : 0
    return (dados?.itens ?? []).filter((i) => i.criadoEm >= limite)
  }, [dados, periodo])

  const r = useMemo(() => {
    const concluidas = itens.filter((i) => i.status === 'Concluída' && i.custoKg != null)
    const custos = concluidas.map((i) => i.custoKg)
    const cron = [...concluidas].sort((a, b) => a.criadoEm - b.criadoEm)

    // ingredientes: % média na receita e em quantas formulações aparecem
    const mapa = new Map()
    for (const f of concluidas) {
      for (const v of f.variaveis) {
        if (v.valor <= 1e-6) continue
        const m = mapa.get(v.nome) ?? { nome: v.nome, usos: 0, soma: 0 }
        m.usos += 1
        m.soma += v.valor * 100
        mapa.set(v.nome, m)
      }
    }
    const ingredientes = [...mapa.values()]
      .map((m) => ({ ...m, media: m.soma / m.usos }))
      .sort((a, b) => b.media - a.media)
      .slice(0, 10)

    return {
      concluidas: concluidas.length,
      semSolucao: itens.filter((i) => i.status === 'Sem solução').length,
      medio: custos.length ? custos.reduce((a, b) => a + b, 0) / custos.length : null,
      menor: custos.length ? Math.min(...custos) : null,
      maior: custos.length ? Math.max(...custos) : null,
      variacao: cron.length >= 2 ? ((cron[cron.length - 1].custoKg - cron[0].custoKg) / cron[0].custoKg) * 100 : null,
      pontos: cron.slice(-10).map((i) => ({ rotulo: diaMes(i.criadoEm), valor: i.custoKg })),
      ingredientes,
    }
  }, [itens])

  const receita = (f) => f.variaveis.filter((v) => v.valor > 1e-6).map((v) => `${v.nome} ${num(v.valor * 100)}%`).join(' | ')

  function baixarCsv() {
    if (itens.length === 0) return avisos.erro('Não há formulações no período para exportar.')
    const linhas = [['Código', 'Data', 'Fórmula', 'Custo (R$/kg)', 'Status', 'Receita (% da ração)']]
    for (const i of itens) {
      linhas.push([i.codigo, i.data, i.formula, i.custoKg != null ? i.custoKg.toFixed(2).replace('.', ',') : '', i.status, receita(i)])
    }
    // ";" e BOM para o Excel em português abrir com acentos e colunas certas
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-suinonutri-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    avisos.sucesso('Arquivo CSV gerado. Abra no Excel.')
  }

  const vazio = dados && itens.length === 0
  const variacao = r.variacao
  const maxMedia = r.ingredientes[0]?.media ?? 1

  return (
    <Shell ativo="relatorios" aoNavegar={aoNavegar} aoSair={aoSair}>
      <div className="dash-cabecalho">
        <div>
          <h1>Relatórios</h1>
          <p className="sub">Resumo das formulações calculadas, com custos e ingredientes mais usados.</p>
        </div>
        <div className="cab-acoes-sempre no-print">
          <select className="texto filtro-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Período">
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
          </select>
          <button className="btn-sec" onClick={baixarCsv}>Baixar CSV</button>
          <button className="btn-topo" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <div className="so-impressao">
        <strong>SuínoNutri — Relatório de formulações</strong>
        <span>{getUsuario()?.nome} • {rotuloPeriodo} • gerado em {new Date().toLocaleDateString('pt-BR')}</span>
      </div>

      {!dados && <div className="vazio">Carregando…</div>}
      {vazio && <div className="card-branco"><div className="vazio">Nenhuma formulação neste período. Faça uma Nova Otimização para gerar dados.</div></div>}

      {dados && !vazio && (
        <>
          <section className="cards">
            <div className="kpi">
              <svg width="44" height="44" viewBox="0 0 24 24" {...traco}><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>
              <p className="kpi-titulo">Formulações</p>
              <p className="kpi-valor">{itens.length}</p>
              <p className="kpi-nota">{r.concluidas} concluídas • {r.semSolucao} sem solução</p>
            </div>
            <div className="kpi">
              <svg width="44" height="44" viewBox="0 0 24 24" {...traco}><circle cx="12" cy="12" r="9.5" /><path d="M15 9.5c-.5-1-1.600-1.500-3-1.500-1.700 0-3 .8-3 2s1.300 1.700 3 2 3 .8 3 2-1.300 2-3 2c-1.400 0-2.500-.5-3-1.500M12 6v2M12 16v2" /></svg>
              <p className="kpi-titulo">Custo médio por kg</p>
              <p className="kpi-valor">{r.medio != null ? brl(r.medio) : '–'}</p>
              <p className="kpi-nota">{r.menor != null ? `menor ${brl(r.menor)} • maior ${brl(r.maior)}` : 'sem formulações concluídas'}</p>
            </div>
            <div className="kpi">
              <svg width="44" height="44" viewBox="0 0 24 24" {...traco}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
              <p className="kpi-titulo">Variação do custo</p>
              <p className="kpi-valor">{variacao != null ? `${variacao > 0 ? '+' : ''}${pct(variacao)}` : '–'}</p>
              <p className="kpi-nota">{variacao != null ? 'da primeira para a última' : 'precisa de 2 formulações'}</p>
            </div>
          </section>

          <div className="dash-baixo">
            <section className="card-branco">
              <h2>Custo por formulação (R$/kg)</h2>
              <p className="sub-grafico">— Formulações concluídas, da mais antiga para a mais recente</p>
              <GraficoCusto pontos={r.pontos} />
              {variacao != null && (
                <p className="nota-grafico">
                  {variacao < -0.05 ? `Redução de ${pct(Math.abs(variacao))} no custo` : variacao > 0.05 ? `Aumento de ${pct(variacao)} no custo` : 'Custo estável'} no período.
                </p>
              )}
            </section>

            <section className="card-branco">
              <h2>Ingredientes mais usados</h2>
              <p className="sub-grafico">— Percentual médio na ração</p>
              {r.ingredientes.length === 0 && <div className="vazio">Sem receitas concluídas no período.</div>}
              <div className="barras">
                {r.ingredientes.map((i) => (
                  <div key={i.nome} className="barra-linha">
                    <div className="barra-rotulo"><span>{i.nome}</span><strong>{num(i.media)}%</strong></div>
                    <div className="barra-trilho"><div className="barra-preenche" style={{ width: `${Math.max(3, (i.media / maxMedia) * 100)}%` }} /></div>
                    <div className="barra-nota">usado em {i.usos} de {r.concluidas} {r.concluidas === 1 ? 'formulação' : 'formulações'}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="card-branco bloco-tabela">
            <h2>Formulações do período</h2>
            <div className="tabela-wrap">
              <table>
                <thead>
                  <tr><th>Data</th><th>Código</th><th style={{ textAlign: 'left' }}>Fórmula</th><th>Custo/kg</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {itens.map((f) => (
                    <tr key={f.id} className="linha-clicavel" onClick={() => aoAbrir(f.id)} title="Ver resultado">
                      <td>{f.data}</td>
                      <td>{f.codigo}</td>
                      <td style={{ textAlign: 'left' }}>{f.formula}</td>
                      <td>{f.custoKg != null ? brl(f.custoKg) : '–'}</td>
                      <td><span className={`status ${f.status === 'Concluída' ? 'concluida' : f.status === 'Em análise' ? 'analise' : 'sem-solucao'}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dados.total > dados.itens.length && (
              <p className="dica" style={{ marginTop: 12 }}>Considerando as {dados.itens.length} formulações mais recentes de {dados.total}.</p>
            )}
          </section>
        </>
      )}
    </Shell>
  )
}
