import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { useAvisos } from '../components/Avisos'
import { buscarHistorico, excluirProblema } from '../services/api'
import { brl, pct } from '../services/formatos'

const classe = { Concluída: 'concluida', 'Em análise': 'analise', 'Sem solução': 'sem-solucao' }

export function Historico({ aoSair, aoNavegar, aoAbrir }) {
  const avisos = useAvisos()
  const [dados, setDados] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')

  const carregar = () => buscarHistorico().then(setDados).catch((e) => { setDados({ total: 0, itens: [] }); avisos.erro(e.message) })
  useEffect(() => { carregar() }, [])

  async function excluir(f) {
    if (!window.confirm(`Excluir a formulação ${f.codigo} (${f.formula})? Essa ação não pode ser desfeita.`)) return
    try {
      await excluirProblema(f.id)
      avisos.sucesso('Formulação excluída.')
      await carregar()
    } catch (err) {
      avisos.erro(err.message)
    }
  }

  const itens = (dados?.itens ?? []).filter((f) =>
    (filtro === 'Todos' || f.status === filtro) &&
    `${f.formula} ${f.codigo}`.toLowerCase().includes(busca.toLowerCase()))

  return (
    <Shell ativo="historico" aoNavegar={aoNavegar} aoSair={aoSair}>
      <div className="dash-cabecalho">
        <div>
          <h1>Histórico</h1>
          <p className="sub">Todas as formulações já calculadas. Clique em uma linha para ver a receita.</p>
        </div>
        <div className="cab-acoes-sempre">
          <button className="btn-topo" onClick={() => aoNavegar('nova')}><span className="mais">+</span> Nova Otimização</button>
        </div>
      </div>

      <section className="card-branco">
        <div className="filtros">
          <input className="texto busca" placeholder="Buscar por nome ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="texto" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por status">
            {['Todos', 'Concluída', 'Em análise', 'Sem solução'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {!dados && <div className="vazio">Carregando…</div>}
        {dados && (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Código</th><th style={{ textAlign: 'left' }}>Fórmula</th><th>Custo/kg</th><th>Economia</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {itens.map((f) => (
                  <tr key={f.id} className="linha-clicavel" onClick={() => aoAbrir(f.id)} title="Ver resultado">
                    <td>{f.data}</td>
                    <td>{f.codigo}</td>
                    <td style={{ textAlign: 'left' }}>{f.formula}</td>
                    <td>{f.custoKg != null ? brl(f.custoKg) : '–'}</td>
                    <td>{f.economia != null ? pct(f.economia) : '–'}</td>
                    <td><span className={`status ${classe[f.status]}`}>{f.status}</span></td>
                    <td className="acoes">
                      <button className="btn-mini perigo" onClick={(e) => { e.stopPropagation(); excluir(f) }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {itens.length === 0 && <div className="vazio">{dados.itens.length === 0 ? 'Nenhuma formulação ainda.' : 'Nenhuma formulação encontrada.'}</div>}
          </div>
        )}
        {dados && dados.total > dados.itens.length && (
          <p className="dica" style={{ marginTop: 12 }}>Mostrando as {dados.itens.length} mais recentes de {dados.total}.</p>
        )}
      </section>
    </Shell>
  )
}
