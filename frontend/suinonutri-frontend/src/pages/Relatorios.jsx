import { useEffect, useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { Ajuda } from '../components/Ajuda'
import { useAvisos } from '../components/Avisos'
import { buscarRelatorio, getUsuario } from '../services/api'
import { brl } from '../services/formatos'

// Esta tela só traz ANÁLISES. O resumo e o gráfico do custo ficam no Dashboard,
// e a lista de todas as rações fica no Histórico de otimizações.
const periodos = [
  { id: 'tudo', rotulo: 'Todo o período', dias: null },
  { id: '30', rotulo: 'Últimos 30 dias', dias: 30 },
  { id: '90', rotulo: 'Últimos 90 dias', dias: 90 },
]
const num = (v, casas = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
// "73,4 kg" ou, para quantidades pequenas, "100 g" (mais fácil de entender e de pesar)
const peso = (kg) => (kg < 1 ? `${num(kg * 1000, kg * 1000 < 10 ? 1 : 0)} g` : `${num(kg)} kg`)
const pesoComSinal = (kg) => (Math.abs(kg) < 1e-6 ? 'igual' : `${kg > 0 ? '+' : '−'}${peso(Math.abs(kg))}`)
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
const rotuloRacao = (f) => `${f.codigo} · ${f.formula} · ${f.data}`

export function Relatorios({ aoSair, aoNavegar }) {
  const avisos = useAvisos()
  const [dados, setDados] = useState(null)
  const [periodo, setPeriodo] = useState('tudo')
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')

  useEffect(() => {
    buscarRelatorio().then(setDados).catch((e) => { setDados({ total: 0, itens: [] }); avisos.erro(e.message) })
  }, [])

  const rotuloPeriodo = periodos.find((p) => p.id === periodo).rotulo

  const itens = useMemo(() => {
    const dias = periodos.find((p) => p.id === periodo).dias
    const limite = dias ? Date.now() - dias * 24 * 3600 * 1000 : 0
    return (dados?.itens ?? []).filter((i) => i.criadoEm >= limite)
  }, [dados, periodo])

  const r = useMemo(() => {
    // só as rações que deram certo têm receita para analisar
    const concluidas = itens
      .filter((i) => i.status === 'Concluída' && i.custoKg != null && i.variaveis.length > 0)
      .sort((a, b) => b.criadoEm - a.criadoEm)
    const n = concluidas.length

    // média de cada ingrediente em todas as rações: quanto pesa (kg a cada 100 kg) e quanto custa (% do custo)
    const mapa = new Map()
    for (const f of concluidas) {
      for (const v of f.variaveis) {
        if (v.valor <= 1e-6) continue
        const m = mapa.get(v.nome) ?? { nome: v.nome, usos: 0, peso: 0, parte: 0, temCusto: false }
        m.usos += 1
        m.peso += v.valor * 100
        if (v.custo_unitario != null && f.custoKg > 0) {
          m.parte += ((v.valor * v.custo_unitario) / f.custoKg) * 100
          m.temCusto = true
        }
        mapa.set(v.nome, m)
      }
    }
    const ingredientes = [...mapa.values()].map((m) => ({ ...m, peso: m.peso / n, parte: m.parte / n }))
    const porPeso = [...ingredientes].sort((a, b) => b.peso - a.peso).slice(0, 10)
    const porCusto = ingredientes.filter((i) => i.temCusto).sort((a, b) => b.parte - a.parte).slice(0, 10)

    // restrições que ficaram exatamente no limite (folga 0) em cada ração; as de igualdade são sempre assim, então ficam de fora
    const limites = new Map()
    for (const f of concluidas) {
      for (const c of f.restricoes ?? []) {
        if (c.sinal === '=') continue
        if (Math.abs(c.folga) <= 1e-6 * Math.max(1, Math.abs(c.valor_restricao))) {
          limites.set(c.nome, { nome: c.nome, vezes: (limites.get(c.nome)?.vezes ?? 0) + 1 })
        }
      }
    }
    const noLimite = [...limites.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 8)

    return { concluidas, n, porPeso, porCusto, noLimite }
  }, [itens])

  // comparação: por padrão, a penúltima (ração 1) contra a mais recente (ração 2)
  const fa = r.concluidas.find((f) => String(f.id) === idA) ?? r.concluidas[1]
  const fb = r.concluidas.find((f) => String(f.id) === idB) ?? r.concluidas[0]
  const comparacao = useMemo(() => {
    if (!fa || !fb) return []
    const pesoDe = (f, nome) => (f.variaveis.find((v) => v.nome === nome)?.valor ?? 0) * 100
    const nomes = new Set([...fa.variaveis, ...fb.variaveis].filter((v) => v.valor > 1e-6).map((v) => v.nome))
    return [...nomes]
      .map((nome) => ({ nome, a: pesoDe(fa, nome), b: pesoDe(fb, nome) }))
      .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b))
  }, [fa, fb])

  function baixarCsv() {
    if (r.n === 0) return avisos.erro('Não há rações que deram certo neste período para exportar.')
    const linhas = [['Ingrediente', 'Quantidade média a cada 100 kg (kg)', 'Parte do custo (%)', 'Usado em quantas rações']]
    for (const i of [...r.porPeso].sort((a, b) => b.peso - a.peso)) {
      linhas.push([i.nome, num(i.peso, 2), i.temCusto ? num(i.parte, 2) : '', `${i.usos} de ${r.n}`])
    }
    // ";" e BOM para o Excel em português abrir com acentos e colunas certas
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-suinonutri-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    avisos.sucesso('Planilha gerada. Abra no Excel.')
  }

  const maxPeso = r.porPeso[0]?.peso ?? 1
  const maxParte = r.porCusto[0]?.parte ?? 1
  const semDados = dados && r.n === 0

  return (
    <Shell ativo="relatorios" aoNavegar={aoNavegar} aoSair={aoSair}>
      <div className="relatorio">
        <div className="dash-cabecalho" data-guia="rel-topo">
          <div>
            <h1>Relatórios</h1>
            <p className="sub">Análises para entender do que a sua ração é feita e o que mais pesa no custo.</p>
          </div>
          <div className="cab-acoes-sempre no-print rel-acoes">
            <label className="rel-periodo">
              <span>Período</span>
              <select className="texto filtro-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                {periodos.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
              </select>
            </label>
            <button className="btn-sec" onClick={baixarCsv}>Baixar planilha (Excel)</button>
            <button className="btn-topo" onClick={() => window.print()}>Imprimir ou salvar em PDF</button>
          </div>
        </div>

        <div className="so-impressao">
          <strong>SuínoNutri — Relatório de análises</strong>
          <span>{getUsuario()?.nome} • {rotuloPeriodo} • gerado em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <Ajuda passos={[
          'Esta tela mostra análises. O resumo e o gráfico do custo ficam no Dashboard, e a lista de todas as rações fica no Histórico de otimizações.',
          '"Para onde vai o dinheiro" mostra quais ingredientes mais pesam no custo da ração.',
          '"O que mais vai na ração" mostra quanto de cada ingrediente é usado a cada 100 kg.',
          '"O que mais encarece a ração" lista as exigências que ficaram no limite: são as que mais seguram o custo.',
          '"Comparar duas rações" mostra, lado a lado, o que mudou de uma ração para outra.',
        ]} dica="Para guardar ou mandar para alguém, use os botões do topo: planilha (Excel) ou PDF." />

        {!dados && <div className="vazio">Carregando…</div>}
        {semDados && (
          <div className="card-branco">
            <div className="vazio">
              <p>Ainda não há rações que deram certo neste período para analisar.</p>
              <button className="btn-topo" onClick={() => aoNavegar('nova')}><span className="mais">+</span> Fazer minha primeira otimização</button>
            </div>
          </div>
        )}

        {dados && !semDados && (
          <>
            <p className="rel-resumo">Estas análises usam {plural(r.n, 'ração que deu certo', 'rações que deram certo')} ({rotuloPeriodo.toLowerCase()}).</p>

            <div className="dash-baixo">
              <section className="card-branco">
                <h2>Para onde vai o dinheiro</h2>
                <p className="rel-explica">De cada R$ 100 gastos com a ração, quanto vai para cada ingrediente (em média).</p>
                {r.porCusto.length === 0 && <div className="vazio">Sem dados de preço para calcular.</div>}
                <div className="barras">
                  {r.porCusto.map((i) => (
                    <div key={i.nome} className="barra-linha">
                      <div className="barra-rotulo"><span>{i.nome}</span><strong>R$ {num(i.parte)}</strong></div>
                      <div className="barra-trilho"><div className="barra-preenche barra-custo" style={{ width: `${Math.max(3, (i.parte / maxParte) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card-branco">
                <h2>O que mais vai na ração</h2>
                <p className="rel-explica">Quanto de cada ingrediente é usado, em média, a cada 100 kg de ração.</p>
                <div className="barras">
                  {r.porPeso.map((i) => (
                    <div key={i.nome} className="barra-linha">
                      <div className="barra-rotulo"><span>{i.nome}</span><strong>{peso(i.peso)}</strong></div>
                      <div className="barra-trilho"><div className="barra-preenche" style={{ width: `${Math.max(3, (i.peso / maxPeso) * 100)}%` }} /></div>
                      <div className="barra-nota">Usado em {i.usos} de {plural(r.n, 'ração', 'rações')}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="card-branco bloco-tabela">
              <h2>O que mais encarece a ração</h2>
              <p className="rel-explica">Estas exigências ficaram exatamente no limite. Elas seguram o custo: se você aceitasse um pouco menos (ou um pouco mais, no caso dos máximos), a ração poderia sair mais barata.</p>
              {r.noLimite.length === 0
                ? <div className="vazio">Nenhuma exigência ficou no limite.</div>
                : (
                  <ul className="lista-limites">
                    {r.noLimite.map((l) => (
                      <li key={l.nome}>
                        <span className="limite-nome">{l.nome}</span>
                        <span className="limite-vezes">no limite em {l.vezes} de {plural(r.n, 'ração', 'rações')}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            <section className="card-branco bloco-tabela">
              <h2>Comparar duas rações</h2>
              {r.n < 2
                ? <p className="rel-explica">Calcule pelo menos 2 rações que deram certo para poder compará-las.</p>
                : (
                  <>
                    <p className="rel-explica no-print">Escolha duas rações para ver o que mudou de uma para a outra.</p>
                    <div className="comparar-escolha no-print">
                      <label className="mini"><span>Ração 1</span>
                        <select className="texto" value={String(fa.id)} onChange={(e) => setIdA(e.target.value)}>
                          {r.concluidas.map((f) => <option key={f.id} value={f.id}>{rotuloRacao(f)}</option>)}
                        </select>
                      </label>
                      <label className="mini"><span>Ração 2</span>
                        <select className="texto" value={String(fb.id)} onChange={(e) => setIdB(e.target.value)}>
                          {r.concluidas.map((f) => <option key={f.id} value={f.id}>{rotuloRacao(f)}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="tabela-wrap">
                      <table>
                        <thead>
                          <tr><th style={{ textAlign: 'left' }}>A cada 100 kg de ração</th><th>Ração 1</th><th>Ração 2</th><th>Diferença</th></tr>
                        </thead>
                        <tbody>
                          <tr className="total">
                            <td style={{ textAlign: 'left' }}>Custo por kg</td>
                            <td>{brl(fa.custoKg)}</td>
                            <td>{brl(fb.custoKg)}</td>
                            <td>{Math.abs(fb.custoKg - fa.custoKg) < 0.005 ? 'igual' : `${fb.custoKg > fa.custoKg ? '+' : '−'}${brl(Math.abs(fb.custoKg - fa.custoKg))}`}</td>
                          </tr>
                          {comparacao.map((c) => (
                            <tr key={c.nome}>
                              <td style={{ textAlign: 'left' }}>{c.nome}</td>
                              <td>{peso(c.a)}</td>
                              <td>{peso(c.b)}</td>
                              <td className={Math.abs(c.b - c.a) < 1e-6 ? '' : 'dif-muda'}>{pesoComSinal(c.b - c.a)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
            </section>

            {dados.total > dados.itens.length && (
              <p className="dica">Considerando as {dados.itens.length} rações mais recentes, de um total de {dados.total}.</p>
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
