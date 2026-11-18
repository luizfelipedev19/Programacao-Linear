import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { Campo } from '../components/Campo'
import { Ajuda } from '../components/Ajuda'
import { useAvisos } from '../components/Avisos'
import { atualizarExigencia, criarExigencia, excluirExigencia, listarAlimentos, listarExigencias } from '../services/api'
import { erroNumero, exigenciasPadrao, lerNumero } from '../services/formulacao'

const NUTRIENTES = {
  proteina: { rotulo: 'Proteína', unidade: '%' },
  energia: { rotulo: 'Energia', unidade: 'kcal/kg' },
  fosforo: { rotulo: 'Fósforo', unidade: '%' },
  calcio: { rotulo: 'Cálcio', unidade: '%' },
  lisina: { rotulo: 'Lisina', unidade: '%' },
}
const LIMITE = { proteina: 100, energia: 10000, fosforo: 100, calcio: 100, lisina: 100 }
const vazio = { tipo: 'proteina', nome: 'Proteína', unidade: '%', min: '', max: '', teores: {} }
const num = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 4 }))

// As 5 restrições que já existem no sistema aparecem sempre. Se você cadastrou uma do mesmo nutriente, ela
// substitui a padrão (igual à tela Nova Otimização); excluir a cadastrada volta ao padrão.
function montarLinhas(salvas) {
  const padrao = exigenciasPadrao().map((d) => {
    const s = salvas.find((x) => x.nutriente === d.chave)
    return s
      ? { ...s, padrao: false }
      : { id_exigencia: null, nome: d.rotulo, unidade: d.unidade, nutriente: d.chave, minimo: lerNumero(d.min), maximo: lerNumero(d.max), teores: null, padrao: true }
  })
  return [...padrao, ...salvas.filter((x) => !x.nutriente).map((x) => ({ ...x, padrao: false }))]
}

export function Restricoes({ aoSair, aoNavegar }) {
  const avisos = useAvisos()
  const [lista, setLista] = useState(null)
  const [ingredientes, setIngredientes] = useState([])
  const [form, setForm] = useState(null) // null = fechado | { id?, tipo, nome, unidade, min, max, teores }
  const [tentou, setTentou] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregar = () => listarExigencias().then(setLista).catch((e) => { setLista([]); avisos.erro(e.message) })
  useEffect(() => {
    carregar()
    listarAlimentos().then(setIngredientes).catch(() => setIngredientes([]))
  }, [])

  const mudar = (parte) => setForm((f) => ({ ...f, ...parte }))
  const abrirNovo = () => { setForm({ ...vazio }); setTentou(false) }

  function mudarTipo(tipo) {
    const n = NUTRIENTES[tipo]
    mudar(n ? { tipo, nome: n.rotulo, unidade: n.unidade } : { tipo, nome: '', unidade: '%' })
  }

  function abrirEdicao(r) {
    setTentou(false)
    setForm({
      id: r.id_exigencia ?? undefined, editandoPadrao: r.padrao, tipo: r.nutriente ?? 'outro', nome: r.nome, unidade: r.unidade,
      min: r.minimo === null ? '' : String(r.minimo), max: r.maximo === null ? '' : String(r.maximo),
      teores: Object.fromEntries(Object.entries(r.teores ?? {}).map(([k, v]) => [k, String(v)])),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Erros do formulário aberto, por campo.
  const erros = (() => {
    if (!form) return {}
    const e = {}
    if (!form.nome.trim()) e.nome = 'Informe o nome.'
    const limite = LIMITE[form.tipo]
    e.min = erroNumero(form.min, limite)
    e.max = erroNumero(form.max, limite)
    const a = lerNumero(form.min), b = lerNumero(form.max)
    if (!e.max && a !== null && b !== null && a > b) e.max = 'Menor que o mínimo.'
    if (a === null && b === null) e.limite = 'Informe o mínimo, o máximo ou os dois.'
    if (form.tipo === 'outro' && Object.values(form.teores).some((t) => erroNumero(t, 99999))) e.teores = 'Revise os teores.'
    return e
  })()
  const invalido = Boolean(erros.nome || erros.min || erros.max || erros.limite || erros.teores)

  async function salvar(ev) {
    ev.preventDefault()
    setTentou(true)
    if (invalido) return
    const nome = form.nome.trim()
    const personalizado = form.tipo === 'outro'
    const teores = personalizado
      ? Object.fromEntries(Object.entries(form.teores).map(([k, v]) => [k, lerNumero(v)]).filter(([, v]) => v !== null && v > 0))
      : null
    const dados = {
      nome, unidade: form.unidade.trim() || '%', nutriente: personalizado ? null : form.tipo,
      minimo: lerNumero(form.min), maximo: lerNumero(form.max), teores,
    }
    setSalvando(true)
    try {
      if (form.id) await atualizarExigencia(form.id, dados)
      else await criarExigencia(dados)
      avisos.sucesso(form.id ? 'Restrição atualizada.' : 'Restrição cadastrada.')
      setForm(null)
      await carregar()
    } catch (err) {
      avisos.erro(err.status === 409 ? `Já existe uma restrição chamada "${nome}".` : err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(r) {
    if (!window.confirm(r.nutriente ? `Voltar "${r.nome}" ao valor padrão do sistema?` : `Excluir a restrição "${r.nome}"?`)) return
    try {
      await excluirExigencia(r.id_exigencia)
      avisos.sucesso(r.nutriente ? 'Restrição voltou ao padrão.' : 'Restrição excluída.')
      await carregar()
    } catch (err) {
      avisos.erro(err.message)
    }
  }

  const erroTipoPadrao = form && form.tipo !== 'outro'
  const linhas = lista === null ? null : montarLinhas(lista)

  return (
    <Shell ativo="restricoes" aoNavegar={aoNavegar} aoSair={aoSair}>
      <div className="dash-cabecalho">
        <div>
          <h1>Restrições</h1>
          <p className="sub">As exigências nutricionais (mínimo e máximo de cada nutriente) usadas nas otimizações. As marcadas como "padrão" já vêm no sistema; edite os valores ou cadastre outras. Você também pode criá-las na hora, em Nova Otimização.</p>
        </div>
        <div className="cab-acoes-sempre">
          {!form && <button className="btn-topo" data-guia="rest-nova" onClick={abrirNovo}><span className="mais">+</span> Nova restrição</button>}
        </div>
      </div>

      <Ajuda passos={[
        'Restrições (ou exigências nutricionais) dizem quanto de cada nutriente a ração precisa ter. Exemplo: proteína de 15,5 a 16.',
        'As que têm a etiqueta "padrão" já vêm prontas. Para mudar os números, toque em "Editar".',
        'Para criar outra (como fibra), toque em "Nova restrição" e escolha "Outro nutriente".',
        'Depois, na tela "Nova Otimização", você marca quais delas quer usar em cada ração.',
      ]} dica="Mínimo é o menos que a ração pode ter. Máximo é o mais que ela pode ter. Se não houver limite, deixe em branco." />

      {form && (
        <form className="card-branco" onSubmit={salvar} noValidate>
          <h2>{form.id ? 'Editar restrição' : 'Nova restrição'}</h2>

          <label className="mini" style={{ margin: '12px 0' }}>
            <span>Nutriente</span>
            <select className="texto" value={form.tipo} disabled={Boolean(form.id) || Boolean(form.editandoPadrao)} onChange={(e) => mudarTipo(e.target.value)}>
              {Object.entries(NUTRIENTES).map(([k, n]) => <option key={k} value={k}>{n.rotulo} ({n.unidade})</option>)}
              <option value="outro">Outro nutriente (informar nome e teores)</option>
            </select>
          </label>

          {!erroTipoPadrao && (
            <div className="grade">
              <Campo rotulo="Nome do nutriente (ex.: Fibra)" valor={form.nome} aoMudar={(v) => mudar({ nome: v })} erro={tentou ? erros.nome : ''} />
              <Campo rotulo="Unidade (ex.: %)" valor={form.unidade} aoMudar={(v) => mudar({ unidade: v })} />
            </div>
          )}

          <div className="grade">
            <Campo rotulo={`Mínimo${form.unidade ? ` (${form.unidade})` : ''}`} valor={form.min} aoMudar={(v) => mudar({ min: v })} placeholder="sem mínimo" erro={erros.min || (tentou ? erros.limite : '')} ajuda="O menos que a ração pode ter deste nutriente. Deixe em branco se não houver mínimo." />
            <Campo rotulo={`Máximo${form.unidade ? ` (${form.unidade})` : ''}`} valor={form.max} aoMudar={(v) => mudar({ max: v })} placeholder="sem máximo" erro={erros.max} ajuda="O mais que a ração pode ter deste nutriente. Deixe em branco se não houver máximo." />
          </div>

          {erroTipoPadrao
            ? <p className="dica">Os teores de {form.nome.toLowerCase()} de cada ingrediente vêm do cadastro de Ingredientes.</p>
            : (<>
                <p className="dica">Quanto de {form.nome.trim().toLowerCase() || 'este nutriente'} há em cada ingrediente ({form.unidade.trim() || '%'}). Deixe em branco o que não tem.</p>
                {ingredientes.length === 0
                  ? <p className="aviso">Cadastre ingredientes primeiro para informar os teores.</p>
                  : (<div className="grade">
                      {ingredientes.map((i) => (
                        <Campo key={i.nome} rotulo={i.nome} valor={form.teores[i.nome] ?? ''}
                          aoMudar={(v) => mudar({ teores: { ...form.teores, [i.nome]: v } })}
                          erro={erroNumero(form.teores[i.nome] ?? '', 99999)} />
                      ))}
                    </div>)}
              </>)}

          <div className="form-botoes">
            <button type="submit" className="btn-topo" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn-sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <section className="card-branco">
        {linhas === null && <div className="vazio">Carregando…</div>}
        {linhas && (
          <div className="tabela-wrap tabela-centro">
            <table>
              <thead>
                <tr><th style={{ textAlign: 'left' }}>Restrição</th><th>Unidade</th><th>Mínimo</th><th>Máximo</th><th>Origem</th><th><span className="so-leitor">Ações</span></th></tr>
              </thead>
              <tbody>
                {linhas.map((r) => (
                  <tr key={r.id_exigencia ?? `padrao-${r.nutriente}`}>
                    <td style={{ textAlign: 'left' }}>{r.nome}{r.padrao && <span className="etiqueta">padrão</span>}</td>
                    <td>{r.unidade}</td>
                    <td>{num(r.minimo)}</td>
                    <td>{num(r.maximo)}</td>
                    <td>{r.nutriente ? 'Teores do cadastro de ingredientes' : `Teores informados (${Object.keys(r.teores ?? {}).length})`}</td>
                    <td className="acoes">
                      <button className="btn-mini" onClick={() => abrirEdicao(r)}>Editar</button>
                      {!r.padrao && <button className="btn-mini perigo" onClick={() => excluir(r)}>{r.nutriente ? 'Voltar ao padrão' : 'Excluir'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  )
}
