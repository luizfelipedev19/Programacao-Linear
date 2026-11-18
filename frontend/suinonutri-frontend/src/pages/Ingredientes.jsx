import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { Campo } from '../components/Campo'
import { Ajuda } from '../components/Ajuda'
import { useAvisos } from '../components/Avisos'
import { atualizarAlimento, criarAlimento, excluirAlimento, listarAlimentos } from '../services/api'
import { alimentosExemplo, lerNumero } from '../services/formulacao'
import { brl } from '../services/formatos'

const vazio = { nome: '', custo: '', proteina: '', energia: '', fosforo: '', calcio: '', lisina: '' }
const num = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function Ingredientes({ aoSair, aoNavegar }) {
  const avisos = useAvisos()
  const [lista, setLista] = useState(null)
  const [form, setForm] = useState(null) // null = fechado | { id?, ...campos }
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')

  const carregar = () => listarAlimentos().then(setLista).catch((e) => { setLista([]); avisos.erro(e.message) })
  useEffect(() => { carregar() }, [])

  const mudar = (parte) => setForm((f) => ({ ...f, ...parte }))

  function abrirEdicao(a) {
    setForm({
      id: a.id_alimento, nome: a.nome, custo: String(a.custo_kg), proteina: String(a.proteina),
      energia: String(a.energia), fosforo: String(a.fosforo), calcio: String(a.calcio), lisina: String(a.lisina),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar(e) {
    e.preventDefault()
    const nome = form.nome.trim()
    if (!nome) return avisos.erro('Informe o nome do ingrediente.')

    const c = {}
    for (const [campo, rotulo, max] of [['custo', 'o preço', 99999999], ['proteina', 'a proteína', 100], ['energia', 'a energia', 10000], ['fosforo', 'o fósforo', 100], ['calcio', 'o cálcio', 100], ['lisina', 'a lisina', 100]]) {
      const v = lerNumero(form[campo])
      if (campo === 'custo' && v === null) return avisos.erro('Informe o preço do ingrediente (R$ por kg).')
      if (Number.isNaN(v) || (v !== null && (v < 0 || v > max))) return avisos.erro(`Confira ${rotulo}: use um número entre 0 e ${num(max)}.`)
      c[campo] = v ?? 0
    }
    const dados = { nome, proteina: c.proteina, energia: c.energia, fosforo: c.fosforo, calcio: c.calcio, lisina: c.lisina, custo_kg: c.custo }

    setSalvando(true)
    try {
      if (form.id) await atualizarAlimento(form.id, dados)
      else await criarAlimento(dados)
      avisos.sucesso(form.id ? 'Ingrediente atualizado com sucesso.' : 'Ingrediente cadastrado com sucesso.')
      setForm(null)
      await carregar()
    } catch (err) {
      avisos.erro(err.status === 409 ? `Já existe um ingrediente chamado "${nome}".` : err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(a) {
    if (!window.confirm(`Excluir o ingrediente "${a.nome}"?`)) return
    try {
      await excluirAlimento(a.id_alimento)
      avisos.sucesso('Ingrediente excluído.')
      await carregar()
    } catch (err) {
      avisos.erro(err.status === 409
        ? `"${a.nome}" já foi usado em uma formulação e não pode ser excluído. Exclua a formulação no Histórico de otimizações primeiro.`
        : err.message)
    }
  }

  async function carregarExemplos() {
    setSalvando(true)
    let criados = 0
    for (const a of alimentosExemplo()) {
      try { await criarAlimento(a); criados++ } catch { /* já existe: ignora */ }
    }
    setSalvando(false)
    avisos.sucesso(criados ? `${criados} ingredientes de exemplo adicionados.` : 'Os ingredientes de exemplo já estavam cadastrados.')
    await carregar()
  }

  const filtrada = (lista ?? []).filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <Shell ativo="ingredientes" aoNavegar={aoNavegar} aoSair={aoSair}>
      <div className="dash-cabecalho">
        <div>
          <h1>Ingredientes</h1>
          <p className="sub">Os ingredientes cadastrados aparecem na tela de Nova Otimização.</p>
        </div>
        <div className="cab-acoes-sempre">
          {!form && <button className="btn-topo" data-guia="ing-novo" onClick={() => setForm({ ...vazio })}><span className="mais">+</span> Novo ingrediente</button>}
        </div>
      </div>

      <Ajuda passos={[
        'Aqui ficam os ingredientes que você usa na ração (milho, farelo, sal...).',
        'Para cadastrar, toque em "Novo ingrediente" e informe o nome, o preço de 1 kg e do que ele é feito (proteína, energia...).',
        'Se o ingrediente não tem um nutriente, deixe 0 ou em branco.',
        'Depois de cadastrados, os ingredientes aparecem na tela "Nova Otimização" para você marcar os que quer usar.',
      ]} dica="Os números de proteína, energia etc. costumam vir na embalagem ou na tabela do fornecedor." />

      {form && (
        <form className="card-branco" onSubmit={salvar} noValidate>
          <h2>{form.id ? 'Editar ingrediente' : 'Novo ingrediente'}</h2>
          <div className="campo-input" style={{ margin: '12px 0' }}>
            <input className="texto" placeholder="Nome (ex.: Milho)" value={form.nome} maxLength={100} onChange={(e) => mudar({ nome: e.target.value })} />
          </div>
          <div className="grade">
            <Campo rotulo="Preço (R$/kg)" valor={form.custo} aoMudar={(v) => mudar({ custo: v })} ajuda="Quanto você paga por 1 kg deste ingrediente, em reais." />
            <Campo rotulo="Proteína %" valor={form.proteina} aoMudar={(v) => mudar({ proteina: v })} placeholder="0" ajuda="De cada 100 kg do ingrediente, quantos kg são proteína. Ex.: 8,5 no milho." />
            <Campo rotulo="Energia kcal/kg" valor={form.energia} aoMudar={(v) => mudar({ energia: v })} placeholder="0" ajuda="A energia que 1 kg do ingrediente fornece ao animal, em quilocalorias (kcal). Ex.: 3.493 no milho." />
            <Campo rotulo="Fósforo %" valor={form.fosforo} aoMudar={(v) => mudar({ fosforo: v })} placeholder="0" ajuda="De cada 100 kg do ingrediente, quantos kg são fósforo, um mineral dos ossos." />
            <Campo rotulo="Cálcio %" valor={form.calcio} aoMudar={(v) => mudar({ calcio: v })} placeholder="0" ajuda="De cada 100 kg do ingrediente, quantos kg são cálcio, mineral importante para os ossos." />
            <Campo rotulo="Lisina %" valor={form.lisina} aoMudar={(v) => mudar({ lisina: v })} placeholder="0" ajuda="De cada 100 kg do ingrediente, quantos kg são lisina, um aminoácido essencial para o crescimento." />
          </div>
          <div className="form-botoes">
            <button type="submit" className="btn-topo" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="btn-sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <section className="card-branco">
        {lista && lista.length > 0 && (
          <input className="texto busca" placeholder="Buscar ingrediente…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        )}
        {lista === null && <div className="vazio">Carregando…</div>}
        {lista && lista.length === 0 && (
          <div className="vazio">
            <p>Você ainda não cadastrou nenhum ingrediente.</p>
            <button className="btn-sec" onClick={carregarExemplos} disabled={salvando}>
              {salvando ? 'Adicionando…' : 'Adicionar ingredientes de exemplo (suínos 30 a 60 kg)'}
            </button>
          </div>
        )}
        {lista && lista.length > 0 && (
          <div className="tabela-wrap">
            <table>
              <thead>
                <tr><th style={{ textAlign: 'left' }}>Ingrediente</th><th>R$/kg</th><th>Proteína %</th><th>Energia</th><th>Fósforo %</th><th>Cálcio %</th><th>Lisina %</th><th><span className="so-leitor">Ações</span></th></tr>
              </thead>
              <tbody>
                {filtrada.map((a) => (
                  <tr key={a.id_alimento}>
                    <td style={{ textAlign: 'left' }}>{a.nome}</td>
                    <td>{brl(a.custo_kg)}</td>
                    <td>{num(a.proteina)}</td>
                    <td>{num(a.energia)}</td>
                    <td>{num(a.fosforo)}</td>
                    <td>{num(a.calcio)}</td>
                    <td>{num(a.lisina)}</td>
                    <td className="acoes">
                      <button className="btn-mini" onClick={() => abrirEdicao(a)}>Editar</button>
                      <button className="btn-mini perigo" onClick={() => excluir(a)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrada.length === 0 && <div className="vazio">Nenhum ingrediente encontrado.</div>}
          </div>
        )}
      </section>
    </Shell>
  )
}
