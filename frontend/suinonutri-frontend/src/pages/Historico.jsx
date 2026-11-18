import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { useAvisos } from '../components/Avisos'
import { buscarHistorico, excluirProblema } from '../services/api'
import { Ajuda } from '../components/Ajuda'
import { brl, pct, rotuloStatus } from '../services/formatos'


export function Historico({ aoSair, aoNavegar, aoAbrir }) {
  const avisos = useAvisos()
  const [dados, setDados] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')

  const carregar = () => buscarHistorico().then(setDados).catch((e) => { setDados({ total: 0, itens: [] }); avisos.erro(e.message) })
  useEffect(() => { carregar() }, [])

  async function excluir(f) {
    if (!window.confirm(`Excluir a ração ${f.codigo} (${f.formula})? Isso não pode ser desfeito.`)) return
    try {
      await excluirProblema(f.id)
      avisos.sucesso('Ração excluída.')
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
          <h1>Histórico de otimizações</h1>
          <p className="sub">Todas as rações que você já calculou. Toque em uma linha para ver a receita.</p>
        </div>
        <div className="cab-acoes-sempre">
          <button className="btn-topo" onClick={() => aoNavegar('nova')}><span className="mais">+</span> Nova Otimização</button>
        </div>
      </div>

      <Ajuda passos={[
        'Aqui ficam todas as rações que você já calculou, da mais nova para a mais antiga.',
        'Para achar uma ração, digite o nome na busca ou escolha uma situação (por exemplo, "Sem solução").',
        'Toque em uma linha para ver a receita completa.',
        'O botão "Excluir" apaga a ração da lista. Isso não pode ser desfeito.',
      ]} dica={'"Sem solução" quer dizer que não existe ração que cumpra todas as exigências com os ingredientes escolhidos. Tente marcar mais ingredientes ou folgar os limites.'} />

      <section className="card-branco" data-guia="hist-lista">
        <div className="filtros">
          <input className="texto busca" placeholder="Buscar por nome ou código…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="texto" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por situação">
            {['Todos', 'Concluída', 'Em análise', 'Sem solução'].map((o) => <option key={o} value={o}>{o === 'Concluída' ? 'Deu certo' : o}</option>)}
          </select>
        </div>

        {!dados && <div className="vazio">Carregando…</div>}
        {dados && (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Nº</th><th style={{ textAlign: 'left' }}>Nome da ração</th><th>Custo por kg</th><th>Economia</th><th>Situação</th><th><span className="so-leitor">Ações</span></th></tr>
              </thead>
              <tbody>
                {itens.map((f) => (
                  <tr key={f.id} className="linha-clicavel" onClick={() => aoAbrir(f.id)} title="Ver resultado">
                    <td>{f.data}</td>
                    <td>{f.codigo}</td>
                    <td style={{ textAlign: 'left' }}>{f.formula}</td>
                    <td>{f.custoKg != null ? brl(f.custoKg) : '–'}</td>
                    <td>{f.economia != null ? pct(f.economia) : '–'}</td>
                    <td><span className={`status ${(rotuloStatus[f.status] ?? rotuloStatus['Em análise']).classe}`}>{(rotuloStatus[f.status] ?? rotuloStatus['Em análise']).texto}</span></td>
                    <td className="acoes">
                      <button className="btn-mini perigo" onClick={(e) => { e.stopPropagation(); excluir(f) }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {itens.length === 0 && <div className="vazio">{dados.itens.length === 0 ? 'Você ainda não calculou nenhuma ração.' : 'Nenhuma ração encontrada com esse filtro.'}</div>}
          </div>
        )}
        {dados && dados.total > dados.itens.length && (
          <p className="dica" style={{ marginTop: 12 }}>Mostrando as {dados.itens.length} mais recentes de {dados.total}.</p>
        )}
      </section>
    </Shell>
  )
}
