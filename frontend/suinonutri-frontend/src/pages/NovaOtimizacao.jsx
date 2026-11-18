import { useEffect, useState } from 'react'
import { Shell } from '../components/Shell'
import { Campo } from '../components/Campo'
import { Ajuda } from '../components/Ajuda'
import { useAvisos } from '../components/Avisos'
import { criarProblemaCompleto, executarProblema, listarAlimentos, listarExigencias } from '../services/api'
import { erroNumero, exigenciasPadrao, limitesPadrao, lerNumero, montarPayload } from '../services/formulacao'

// Cada ingrediente do cadastro vira uma linha (desmarcada) da formulação.
const deAlimento = (a) => {
  const lim = limitesPadrao[a.nome] ?? { minPct: '', maxPct: '' }
  return {
    nome: a.nome, usar: false, custo: String(a.custo_kg),
    proteina: String(a.proteina), energia: String(a.energia), fosforo: String(a.fosforo),
    calcio: String(a.calcio), lisina: String(a.lisina), minPct: lim.minPct, maxPct: lim.maxPct,
  }
}

const texto = (v) => (v === null || v === undefined ? '' : String(v))

// Junta as restrições cadastradas na tela Restrições às sugeridas: uma cadastrada de nutriente padrão
// substitui a sugerida (mesma chave); as de nutriente próprio entram no fim. Todas começam desmarcadas.
function mesclarSalvas(base, salvas) {
  const padrao = base.map((b) => {
    const s = salvas.find((x) => x.nutriente === b.chave)
    return s ? { ...b, rotulo: s.nome, unidade: s.unidade, min: texto(s.minimo), max: texto(s.maximo) } : b
  })
  const proprias = salvas.filter((x) => !x.nutriente).map((s) => ({
    chave: `s${s.id_exigencia}`, rotulo: s.nome, unidade: s.unidade, min: texto(s.minimo), max: texto(s.maximo),
    custom: true, usar: false, teores: Object.fromEntries(Object.entries(s.teores ?? {}).map(([k, v]) => [k, String(v)])),
  }))
  // idempotente: o React em desenvolvimento executa o efeito duas vezes, e as próprias criadas na tela são preservadas
  const doUsuario = base.filter((x) => x.custom && !x.chave.startsWith('s'))
  return [...padrao.filter((x) => !x.custom), ...proprias, ...doUsuario]
}

const LIMITE = { proteina: 100, energia: 10000, fosforo: 100, calcio: 100, lisina: 100 }

// Erros por campo de um ingrediente marcado; objeto vazio = tudo certo.
function errosIngrediente(ing) {
  if (!ing.usar) return {}
  const e = {}
  for (const c of ['custo', 'proteina', 'energia', 'fosforo', 'calcio', 'lisina']) {
    const m = erroNumero(ing[c], LIMITE[c])
    if (m) e[c] = m
  }
  for (const c of ['minPct', 'maxPct']) {
    const m = erroNumero(ing[c], 100)
    if (m) e[c] = m
  }
  const min = lerNumero(ing.minPct), max = lerNumero(ing.maxPct)
  if (!e.maxPct && min !== null && max !== null && min > max) e.maxPct = 'Menor que o mínimo.'
  return e
}

function errosExigencia(ex) {
  const e = {}
  if (ex.usar === false) return e // desligada: não é validada
  const min = erroNumero(ex.min), max = erroNumero(ex.max)
  if (min) e.min = min
  if (max) e.max = max
  const a = lerNumero(ex.min), b = lerNumero(ex.max)
  if (!e.max && a !== null && b !== null && a > b) e.max = 'Menor que o mínimo.'
  if (ex.custom && Object.values(ex.teores ?? {}).some((t) => erroNumero(t, 99999))) e.teores = 'Revise os teores dos ingredientes.'
  return e
}

// Formulário para criar uma exigência nova (qualquer nutriente). O teor de cada ingrediente
// é informado aqui mesmo, porque o cadastro de ingredientes só guarda os 5 nutrientes padrão.
function NovaExigencia({ ingredientes, existentes, aoAdicionar, aoCancelar }) {
  const [rotulo, setRotulo] = useState('')
  const [unidade, setUnidade] = useState('%')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [teores, setTeores] = useState({})
  const [tentou, setTentou] = useState(false)

  const nome = rotulo.trim()
  const erroNome = !nome ? 'Informe o nome do nutriente.'
    : existentes.some((x) => x.toLowerCase() === nome.toLowerCase()) ? 'Já existe uma exigência com esse nome.' : ''
  const erroMin = erroNumero(min), erroMax = erroNumero(max)
  const a = lerNumero(min), b = lerNumero(max)
  const erroFaixa = !erroMax && a !== null && b !== null && a > b ? 'Menor que o mínimo.' : ''
  const erroSemLimite = a === null && b === null ? 'Informe o mínimo, o máximo ou os dois.' : ''
  const erroTeor = (n) => erroNumero(teores[n] ?? '', 99999)
  const algumTeor = Object.values(teores).some((t) => (lerNumero(t) ?? 0) > 0)
  const invalido = Boolean(erroNome || erroMin || erroMax || erroFaixa || erroSemLimite || ingredientes.some((i) => erroTeor(i.nome)))

  function adicionar() {
    setTentou(true)
    if (invalido) return
    aoAdicionar({ chave: `x${Date.now()}`, rotulo: nome, unidade: unidade.trim() || '%', min, max, custom: true, usar: true, teores })
  }

  return (
    <div className="nova-exi">
      <h3>Nova exigência</h3>
      <div className="exi nova-exi-linha">
        <Campo rotulo="Nutriente (ex.: Fibra)" valor={rotulo} aoMudar={setRotulo} erro={tentou ? erroNome : ''} ajuda="O nome do nutriente que você quer controlar na ração, por exemplo Fibra." />
        <Campo rotulo="Unidade (ex.: %)" valor={unidade} aoMudar={setUnidade} />
      </div>
      <div className="exi nova-exi-linha">
        <Campo rotulo="Mínimo" valor={min} aoMudar={setMin} erro={erroMin || (tentou ? erroSemLimite : '')} ajuda="O menos que a ração pode ter deste nutriente. Deixe em branco se não houver mínimo." />
        <Campo rotulo="Máximo" valor={max} aoMudar={setMax} placeholder="sem limite" erro={erroMax || erroFaixa} ajuda="O mais que a ração pode ter deste nutriente. Deixe em branco se não houver máximo." />
      </div>
      <p className="dica">Quanto de {nome || 'este nutriente'} há em cada ingrediente ({unidade.trim() || '%'}). Deixe em branco o que não tem.</p>
      <div className="grade">
        {ingredientes.map((i) => (
          <Campo key={i.nome} rotulo={i.nome} valor={teores[i.nome] ?? ''} aoMudar={(v) => setTeores((t) => ({ ...t, [i.nome]: v }))} erro={erroTeor(i.nome)} />
        ))}
      </div>
      {tentou && !algumTeor && <p className="aviso">Nenhum ingrediente tem esse nutriente. Com um mínimo maior que zero, o cálculo não terá solução.</p>}
      <div className="form-botoes">
        <button type="button" className="btn-sec" onClick={adicionar}>Adicionar exigência</button>
        <button type="button" className="btn-mini" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  )
}

function Secao({ numero, titulo, resumo, completa, aberta, aoAlternar, guia, children }) {
  return (
    <div className={`acordeao ${aberta ? 'aberto' : ''}`} data-guia={guia}>
      <button type="button" className="acordeao-topo" onClick={aoAlternar} aria-expanded={aberta}>
        <span className={`passo ${completa ? 'ok' : ''}`} aria-hidden>{completa ? '✓' : numero}</span>
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
  const [nome, setNome] = useState('')
  const [ingredientes, setIngredientes] = useState(null) // null = carregando
  const [exigencias, setExigencias] = useState(() => exigenciasPadrao().map((e) => ({ ...e, usar: false }))) // valores sugeridos, mas desmarcadas
  const [abertas, setAbertas] = useState({ nome: false, ing: false, exi: false })
  const [detalhe, setDetalhe] = useState(null)
  const [busca, setBusca] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [teorAberto, setTeorAberto] = useState(null)

  useEffect(() => {
    listarAlimentos()
      .then((lista) => setIngredientes(lista.map(deAlimento)))
      .catch((e) => { setIngredientes([]); avisos.erro(e.message) })
    listarExigencias()
      .then((salvas) => setExigencias((atual) => mesclarSalvas(atual, salvas)))
      .catch(() => { /* sem restrições cadastradas: ficam só as sugeridas */ })
  }, [])

  const alternar = (chave) => setAbertas((a) => ({ ...a, [chave]: !a[chave] }))
  const mudarIng = (i, parte) => setIngredientes((l) => l.map((x, k) => (k === i ? { ...x, ...parte } : x)))
  const mudarExi = (i, parte) => setExigencias((l) => l.map((x, k) => (k === i ? { ...x, ...parte } : x)))
  const removerExigencia = (chave) => setExigencias((l) => l.filter((x) => x.chave !== chave))
  const marcarTodos =(usar) => setIngredientes((l) => l.map((x) => ({ ...x, usar })))

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
  const errosIng = (ingredientes ?? []).map(errosIngrediente)
  const errosExi = exigencias.map(errosExigencia)
  const ingOk = marcados >= 2 && errosIng.every((e) => Object.keys(e).length === 0)
  const exiUsadas = exigencias.filter((x) => x.usar !== false).length
  const exiOk = exiUsadas > 0 && errosExi.every((e) => Object.keys(e).length === 0)
  const nomeOk = nome.trim() !== ''
  const pendencia = !nomeOk ? 'Dê um nome para a formulação.'
    : marcados < 2 ? 'Marque pelo menos 2 ingredientes.'
    : !ingOk ? 'Corrija os campos destacados em Ingredientes.'
    : exiUsadas === 0 ? 'Marque pelo menos uma exigência nutricional (etapa 3).'
    : !exiOk ? 'Corrija os campos destacados em Exigências.' : ''

  return (
    <Shell ativo="nova" aoNavegar={aoNavegar} aoSair={aoSair}
      extra={<button className="voltar" onClick={() => aoNavegar('dashboard')}>← Voltar</button>}>
      <h1>Nova Otimização</h1>
      <p className="sub">Toque em cada etapa para preencher. O sistema encontra a ração de menor custo.</p>

      <Ajuda passos={[
        'Dê um nome para a ração (etapa 1). Exemplo: "Ração de crescimento".',
        'Na etapa 2, marque os ingredientes que você tem e confira o preço de cada um. Marque pelo menos 2.',
        'Na etapa 3, marque as exigências nutricionais que a ração precisa cumprir, como proteína e energia. Marque pelo menos uma.',
        'Quando terminar, toque no botão verde "Calcular ração de menor custo".',
        'O sistema mostra quanto de cada ingrediente usar para gastar o menos possível.',
      ]} dica={'Se aparecer "Sem solução", tente marcar mais ingredientes ou deixar as exigências mais folgadas. Ingredientes e exigências são cadastrados nas telas "Ingredientes" e "Restrições".'} />

      <Secao guia="nova-nome" numero="1" titulo="Nome da formulação" completa={nomeOk} resumo={nome || 'sem nome'} aberta={abertas.nome} aoAlternar={() => alternar('nome')}>
        <input className="texto" value={nome} placeholder="Ex.: Ração suínos 30 a 60 kg" onChange={(e) => setNome(e.target.value)} maxLength={100} />
      </Secao>

      <Secao guia="nova-ing" numero="2" titulo="Ingredientes" completa={ingOk} resumo={ingredientes === null ? 'carregando…' : `${marcados} de ${total} selecionados`}
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
                      <Campo rotulo="R$/kg" valor={ing.custo} aoMudar={(v) => mudarIng(i, { custo: v })} placeholder="0,00" erro={errosIng[i]?.custo} ajuda="Quanto você paga por 1 kg deste ingrediente, em reais." />
                      <button type="button" className={`detalhes ${Object.keys(errosIng[i] ?? {}).some((k) => k !== 'custo') ? 'com-erro' : ''}`} onClick={() => setDetalhe(detalhe === ing.nome ? null : ing.nome)}>
                        {detalhe === ing.nome ? 'Fechar' : 'Detalhes'}
                      </button>
                    </div>
                    {detalhe === ing.nome && (
                      <div className="ing-detalhes">
                        <p className="dica">Composição do ingrediente (vem do cadastro) e quanto ele pode ocupar da ração, em %.</p>
                        <div className="grade">
                          <Campo rotulo="Proteína %" valor={ing.proteina} aoMudar={(v) => mudarIng(i, { proteina: v })} erro={errosIng[i]?.proteina} ajuda="De cada 100 kg do ingrediente, quantos kg são proteína." />
                          <Campo rotulo="Energia kcal/kg" valor={ing.energia} aoMudar={(v) => mudarIng(i, { energia: v })} erro={errosIng[i]?.energia} ajuda="A energia que 1 kg do ingrediente dá ao animal, em quilocalorias (kcal)." />
                          <Campo rotulo="Fósforo %" valor={ing.fosforo} aoMudar={(v) => mudarIng(i, { fosforo: v })} erro={errosIng[i]?.fosforo} ajuda="De cada 100 kg do ingrediente, quantos kg são fósforo, um mineral dos ossos." />
                          <Campo rotulo="Cálcio %" valor={ing.calcio} aoMudar={(v) => mudarIng(i, { calcio: v })} erro={errosIng[i]?.calcio} ajuda="De cada 100 kg do ingrediente, quantos kg são cálcio, mineral dos ossos." />
                          <Campo rotulo="Lisina %" valor={ing.lisina} aoMudar={(v) => mudarIng(i, { lisina: v })} erro={errosIng[i]?.lisina} ajuda="De cada 100 kg do ingrediente, quantos kg são lisina, um aminoácido importante para o crescimento." />
                        </div>
                        <div className="grade">
                          <Campo rotulo="Mínimo na ração %" valor={ing.minPct} aoMudar={(v) => mudarIng(i, { minPct: v })} placeholder="sem mínimo" erro={errosIng[i]?.minPct} ajuda="O menos que deste ingrediente precisa entrar na ração, em % do total. Deixe em branco se não houver." />
                          <Campo rotulo="Máximo na ração %" valor={ing.maxPct} aoMudar={(v) => mudarIng(i, { maxPct: v })} placeholder="sem máximo" erro={errosIng[i]?.maxPct} ajuda="O mais que deste ingrediente pode entrar na ração, em % do total. Deixe em branco se não houver." />
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

      <Secao guia="nova-exi" numero="3" titulo="Exigências nutricionais" completa={exiOk} resumo={exigencias.length === 0 ? 'nenhuma' : `${exigencias.filter((x) => x.usar !== false).length} de ${exigencias.length} em uso`} aberta={abertas.exi} aoAlternar={() => alternar('exi')}>
        <button type="button" className="link-tabela no-print" style={{ margin: '0 0 10px' }} onClick={() => aoNavegar('restricoes')}>Gerenciar restrições cadastradas →</button>
        <p className="dica">Quanto a ração precisa ter de cada nutriente. Marque pelo menos uma. Desmarque as que não quiser usar nesta ração, deixe em branco o que não tem limite ou adicione outras.</p>
        {exigencias.every((x) => x.usar === false) && <div className="vazio">Nenhuma exigência marcada. Marque pelo menos uma para poder calcular.</div>}
        {exigencias.map((e, i) => (
          <div key={e.chave} className={`exi-bloco ${e.usar === false ? 'off' : ''}`}>
            <div className="exi">
              <label className="exi-nome exi-usar">
                <input type="checkbox" checked={e.usar !== false} onChange={(ev) => mudarExi(i, { usar: ev.target.checked })} />
                <span>{e.rotulo} <small>({e.unidade})</small></span>
              </label>
              <Campo rotulo="Mínimo" valor={e.min} aoMudar={(v) => mudarExi(i, { min: v })} erro={errosExi[i]?.min} ajuda="O menos que a ração precisa ter deste nutriente." />
              <Campo rotulo="Máximo" valor={e.max} aoMudar={(v) => mudarExi(i, { max: v })} placeholder="sem limite" erro={errosExi[i]?.max} ajuda="O mais que a ração pode ter deste nutriente. Deixe em branco se não houver limite." />
            </div>
            <div className="exi-acoes">
              {e.custom && (
                <button type="button" className={`btn-mini ${errosExi[i]?.teores ? 'perigo' : ''}`} onClick={() => setTeorAberto(teorAberto === e.chave ? null : e.chave)}>
                  {teorAberto === e.chave ? 'Fechar teores' : 'Teores dos ingredientes'}
                </button>
              )}
              {e.custom && <button type="button" className="btn-mini perigo" onClick={() => removerExigencia(e.chave)}>Remover</button>}
            </div>
            {e.custom && teorAberto === e.chave && (
              <div className="ing-detalhes">
                <p className="dica">Quanto de {e.rotulo.toLowerCase()} há em cada ingrediente ({e.unidade}).</p>
                <div className="grade">
                  {(ingredientes ?? []).map((ing) => (
                    <Campo key={ing.nome} rotulo={ing.nome} valor={e.teores[ing.nome] ?? ''}
                      aoMudar={(v) => mudarExi(i, { teores: { ...e.teores, [ing.nome]: v } })}
                      erro={erroNumero(e.teores[ing.nome] ?? '', 99999)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {adicionando ? (
          <NovaExigencia ingredientes={ingredientes ?? []} existentes={exigencias.map((x) => x.rotulo)}
            aoAdicionar={(nova) => { setExigencias((l) => [...l, nova]); setAdicionando(false); avisos.sucesso(`Exigência "${nova.rotulo}" adicionada.`) }}
            aoCancelar={() => setAdicionando(false)} />
        ) : (
          <div className="form-botoes">
            <button type="button" className="btn-sec" onClick={() => setAdicionando(true)} disabled={ingredientes === null || ingredientes.length === 0}>+ Adicionar exigência</button>
            <button type="button" className="btn-mini" onClick={() => setExigencias((l) => [...exigenciasPadrao().map((p) => ({ ...p, usar: l.find((x) => x.chave === p.chave)?.usar ?? false })), ...l.filter((x) => x.custom)])}>Restaurar valores sugeridos</button>
          </div>
        )}
      </Secao>

      {pendencia && ingredientes !== null && <p className="pendencia">{pendencia}</p>}
      <button className="btn-nova" data-guia="nova-calcular" onClick={calcular} disabled={calculando || ingredientes === null || Boolean(pendencia)}>
        {calculando ? 'Calculando…' : 'Calcular ração de menor custo'}
      </button>
      <p className="rodape">Fatec • Projeto de Extensão - v1.0</p>
    </Shell>
  )
}
