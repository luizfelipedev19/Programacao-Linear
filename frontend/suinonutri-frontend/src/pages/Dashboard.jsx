import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { GraficoCusto } from '../components/GraficoCusto'
import { buscarResumo, getUsuario } from '../services/api'

const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',')
const pct = (v) => v.toFixed(1).replace('.', ',') + '%'

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

// texto abaixo do gráfico: compara o primeiro e o último mês com dados
function resumoEvolucao(evolucao) {
  const v = evolucao.filter((p) => p.valor !== null).map((p) => p.valor)
  if (v.length < 2) return ''
  const var_ = ((v[v.length - 1] - v[0]) / v[0]) * 100
  if (Math.abs(var_) < 0.05) return 'Custo estável nos últimos 6 meses'
  return `${var_ < 0 ? 'Redução' : 'Aumento'} de ${pct(Math.abs(var_))} nos últimos 6 meses`
}

export function Dashboard({ aoSair, aoNavegar, aoAbrir }) {
  const [resumo, setResumo] = useState(null)
  const [erro, setErro] = useState('')
  const usuario = getUsuario()

  useEffect(() => {
    buscarResumo().then(setResumo).catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.'))
  }, [])

  const v = resumo?.variacaoCusto
  const notaCusto = v == null
    ? 'Média dos últimos 30 dias'
    : `${v < 0 ? '↓ -' : '↑ +'}${brl(Math.abs(v))} vs. 30 dias antes`

  return (
    <Shell
      ativo="dashboard"
      aoSair={aoSair}
      aoNavegar={aoNavegar}
    >
      <div className="dash-cabecalho">
        <div>
          <h1>Dashboard <span className="ponto">•</span> Visão Inicial</h1>
          <p className="sub">Olá, <b>{usuario?.nome.split(' ')[0] ?? ''}</b> • Visão geral antes da otimização</p>
        </div>
        <div className="cab-acoes">
          <span className="chip-periodo">
            <svg width="22" height="22" viewBox="0 0 24 24" {...traco}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
            Últimos 30 dias
          </span>
          <button className="btn-topo" onClick={() => aoNavegar('nova')}>
            <span className="mais">+</span> Nova Otimização
          </button>
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      <section className="cards">
        <div className="kpi">
          <svg width="44" height="44" viewBox="0 0 24 24" {...traco}><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>
          <p className="kpi-titulo">Total de Formulações</p>
          <p className="kpi-valor">{resumo?.totalFormulacoes ?? '–'}</p>
          <p className="kpi-nota">↑ +{resumo?.novasNoMes ?? 0} este mês</p>
        </div>
        <div className="kpi">
          <svg width="44" height="44" viewBox="0 0 24 24" {...traco}><circle cx="12" cy="12" r="9.5" /><path d="M15 9.5c-.5-1-1.600-1.500-3-1.500-1.700 0-3 .8-3 2s1.300 1.700 3 2 3 .8 3 2-1.300 2-3 2c-1.400 0-2.500-.5-3-1.500M12 6v2M12 16v2" /></svg>
          <p className="kpi-titulo">Economia Média</p>
          <p className="kpi-valor">{resumo?.economiaMedia != null ? pct(resumo.economiaMedia) : '–'}</p>
          <p className="kpi-nota">vs. formulação anterior</p>
        </div>
        <div className="kpi">
          <svg width="44" height="44" viewBox="0 0 24 24" {...traco}><path d="M12 3v18M7 21h10M4 7h16" /><path d="M4 7l-2.500 7a3.500 3.500 0 0 0 5 0L4 7ZM20 7l-2.500 7a3.500 3.500 0 0 0 5 0L20 7Z" /></svg>
          <p className="kpi-titulo">Custo Médio por kg</p>
          <p className="kpi-valor">{resumo?.custoMedioKg != null ? brl(resumo.custoMedioKg) : '–'}</p>
          <p className="kpi-nota">{notaCusto}</p>
        </div>
      </section>

      <div className="dash-baixo">
        <section className="card-branco">
          <h2>Evolução do Custo (R$/kg)</h2>
          <p className="sub-grafico">— Últimos 6 meses</p>
          {resumo ? <GraficoCusto pontos={resumo.evolucao} /> : <div className="vazio">Carregando…</div>}
          {resumo && <p className="nota-grafico">{resumoEvolucao(resumo.evolucao)}</p>}
        </section>

        <section className="card-branco">
          <h2>Histórico de formulações recentes</h2>
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr><th>Data</th><th>Código</th><th>Fórmula</th><th>Custo/kg</th><th>Economia</th><th>Status</th></tr>
              </thead>
              <tbody>
                {resumo?.historico.map((f) => (
                  <tr key={f.id} className="linha-clicavel" onClick={() => aoAbrir(f.id)} title="Ver resultado">
                    <td>{f.data}</td>
                    <td>{f.codigo}</td>
                    <td>{f.formula}</td>
                    <td>{f.custoKg != null ? brl(f.custoKg) : '–'}</td>
                    <td>{f.economia != null ? pct(f.economia) : '–'}</td>
                    <td>
                      <span className={`status ${f.status === 'Concluída' ? 'concluida' : f.status === 'Em análise' ? 'analise' : 'sem-solucao'}`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resumo && resumo.historico.length === 0 && <div className="vazio">Nenhuma formulação ainda. Clique em “Nova Otimização” para começar.</div>}
            {!resumo && !erro && <div className="vazio">Carregando…</div>}
          </div>
          <button className="link-tabela" onClick={() => aoNavegar('historico')}>Ver histórico completo →</button>
        </section>
      </div>

      <button className="btn-nova so-mobile" onClick={() => aoNavegar('nova')}>
        <span style={{ fontSize: 38, lineHeight: 1, fontWeight: 300 }}>+</span> Nova Otimização
      </button>
      <p className="rodape">Fatec • Projeto de Extensão - v1.0</p>
    </Shell>
  )
}
