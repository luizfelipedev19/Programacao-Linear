import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { Campo } from '../components/Campo'
import { useAvisos } from '../components/Avisos'
import { criarProblemaCompleto, executarProblema, listarAlimentos } from '../services/api'
import { exigenciasPadrao, limitesPadrao, montarPayload } from '../services/formulacao'

// Cada ingrediente do cadastro vira uma linha (desmarcada) da formulação.
const deAlimento = (a) => {
  const lim = limitesPadrao[a.nome] ?? { minPct: '', maxPct: '' }
  return {
    nome: a.nome, usar: false, custo: String(a.custo_kg),
    proteina: String(a.proteina), energia: String(a.energia), fosforo: String(a.fosforo),
    calcio: String(a.calcio), lisina: String(a.lisina), minPct: lim.minPct, maxPct: lim.maxPct,
  }
}

function Secao({ titulo, resumo, aberta, aoAlternar, children }) {
  return (
    <div className={`acordeao ${aberta ? 'aberto' : ''}`}>
      <button type="button" className="acordeao-topo" onClick={aoAlternar} aria-expanded={aberta}>
        <span className="acordeao-titulo">{titulo}</span>
        <span className="acordeao-resumo">{resumo}</span>
        <span className="seta" aria-hidden>{aberta ? '⌃' : '⌄'}</span>
      </button>
      {aberta && <div className="acordeao-corpo">{children}</div>}
    </div>
  )
}

export function NovaOtimizacao({ aoSair, aoNavegar, aoConcluir }) {
  const avisos = useAvisos()
  const [nome, setNome] = useState('Ração suínos 30 a 60 kg')
  const [ingredientes, setIngredientes] = useState(null) // null = carregando
  const [exigencias, setExigencias] = useState(exigenciasPadrao)
  const [abertas, setAbertas] = useState({ nome: false, ing: false, exi: false }) // tudo fechado
  const [detalhe, setDetalhe] = useState(null)
  const [busca, setBusca] = useState('')
  const [calculando, setCalculando] = useState(false)

  useEffect(() => {
    listarAlimentos()
      .then((lista) => setIngredientes(lista.map(deAlimento)))
      .catch((e) => { setIngredientes([]); avisos.erro(e.message) })
  }, [])

  const alternar = (chave) => setAbertas((a) => ({ ...a, [chave]: !a[chave] }))
  const mudarIng = (i, parte) => setIngredientes((l) => l.map((x, k) => (k === i ? { ...x, ...parte } : x)))
  const mudarExi = (i, parte) => setExigencias((l) => l.map((x, k) => (k === i ? { ...x, ...parte } : x)))
  const marcarTodos = (usar) => setIngredientes((l) => l.map((x) => ({ ...x, usar })))

  async function calcular() {
    const m = montarPayload(nome, ingredientes ?? [], exigencias)
    if (!m.ok) return avisos.erro(m.erro)
    setCalculando(true)
    try {
      const { id_problema } = await criarProblemaCompleto(m.payload)
      await executarProblema(id_problema)
      avisos.sucesso('Ração calculada com sucesso.')
      aoConcluir(id_problema)
    } catch (e) {
      avisos.erro(e.message || 'Não foi possível calcular a ração.')
      setCalculando(false)
    }
  }

  const total = ingredientes?.length ?? 0
  const marcados = ingredientes?.filter((i) => i.usar).length ?? 0

  return (
    <Shell ativo="nova" aoNavegar={aoNavegar} aoSair={aoSair}
      extra={<button className="voltar" onClick={() => aoNavegar('dashboard')}>← Voltar</button>}>
      <h1>Nova Otimização</h1>
      <p className="sub">Toque em cada etapa para preencher. O sistema encontra a ração de menor custo.</p>

      <Secao titulo="1. Nome da formulação" resumo={nome || 'sem nome'} aberta={abertas.nome} aoAlternar={() => alternar('nome')}>
        <input className="texto" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
      </Secao>

      <Secao titulo="2. Ingredientes" resumo={ingredientes === null ? 'carregando…' : `${marcados} de ${total} selecionados`}
        aberta={abertas.ing} aoAlternar={() => alternar('ing')}>
        {ingredientes === null && <div className="vazio">Carregando ingredientes…</div>}
        {ingredientes && total === 0 && (
          <div className="vazio">
            <p>Você ainda não cadastrou ingredientes.</p>
            <button className="btn-sec" onClick={() => aoNavegar('ingredientes')}>Cadastrar ingredientes</button>
          </div>
        )}
        {ingredientes && total > 0 && (
          <>
            <p className="dica">Marque os ingredientes que você tem e confira o preço (R$ por kg).</p>
            <div className="filtros">
              <input className="texto busca" placeholder="Buscar ingrediente…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <button type="button" className="btn-mini" onClick={() => marcarTodos(true)}>Marcar todos</button>
              <button type="button" className="btn-mini" onClick={() => marcarTodos(false)}>Limpar</button>
            </div>
            <div className="lista-ing">
              {ingredientes.map((ing, i) => {
                if (!ing.nome.toLowerCase().includes(busca.toLowerCase())) return null
                return (
                  <div key={ing.nome} className={`ing ${ing.usar ? '' : 'off'}`}>
                    <div className="ing-topo">
                      <label className="ing-nome">
                        <input type="checkbox" checked={ing.usar} onChange={(e) => mudarIng(i, { usar: e.target.checked })} />
                        {ing.nome}
                      </label>
                      <Campo rotulo="R$/kg" valor={ing.custo} aoMudar={(v) => mudarIng(i, { custo: v })} placeholder="0,00" />
                      <button type="button" className="detalhes" onClick={() => setDetalhe(detalhe === ing.nome ? null : ing.nome)}>
                        {detalhe === ing.nome ? 'Fechar' : 'Detalhes'}
                      </button>
                    </div>
                    {detalhe === ing.nome && (
                      <div className="ing-detalhes">
                        <p className="dica">Composição do ingrediente (vem do cadastro) e quanto ele pode ocupar da ração, em %.</p>
                        <div className="grade">
                          <Campo rotulo="Proteína %" valor={ing.proteina} aoMudar={(v) => mudarIng(i, { proteina: v })} />
                          <Campo rotulo="Energia kcal/kg" valor={ing.energia} aoMudar={(v) => mudarIng(i, { energia: v })} />
                          <Campo rotulo="Fósforo %" valor={ing.fosforo} aoMudar={(v) => mudarIng(i, { fosforo: v })} />
                          <Campo rotulo="Cálcio %" valor={ing.calcio} aoMudar={(v) => mudarIng(i, { calcio: v })} />
                          <Campo rotulo="Lisina %" valor={ing.lisina} aoMudar={(v) => mudarIng(i, { lisina: v })} />
                        </div>
                        <div className="grade">
                          <Campo rotulo="Mínimo na ração %" valor={ing.minPct} aoMudar={(v) => mudarIng(i, { minPct: v })} placeholder="sem mínimo" />
                          <Campo rotulo="Máximo na ração %" valor={ing.maxPct} aoMudar={(v) => mudarIng(i, { maxPct: v })} placeholder="sem máximo" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Secao>

      <Secao titulo="3. Exigências nutricionais" resumo={`${exigencias.length} nutrientes`} aberta={abertas.exi} aoAlternar={() => alternar('exi')}>
        <p className="dica">Quanto a ração precisa ter de cada nutriente. Deixe em branco se não houver limite.</p>
        {exigencias.map((e, i) => (
          <div key={e.chave} className="exi">
            <span className="exi-nome">{e.rotulo} <small>({e.unidade})</small></span>
            <Campo rotulo="Mínimo" valor={e.min} aoMudar={(v) => mudarExi(i, { min: v })} />
            <Campo rotulo="Máximo" valor={e.max} aoMudar={(v) => mudarExi(i, { max: v })} placeholder="sem limite" />
          </div>
        ))}
      </Secao>

      <button className="btn-nova" onClick={calcular} disabled={calculando || ingredientes === null}>
        {calculando ? 'Calculando…' : 'Calcular ração de menor custo'}
      </button>
      <p className="rodape">Fatec • Projeto de Extensão - v1.0</p>
    </Shell>
  )
}
