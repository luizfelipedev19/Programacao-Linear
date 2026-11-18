import { useEffect, useRef, useState } from 'react'
import { getContraste, getLetra, getVozAuto, getVozNome, getVozVelocidade, setContraste, setLetra, setVozAuto, setVozNome, setVozVelocidade } from '../services/acessibilidade'
import { VOZ_PADRAO, listarVozes, narrar, parar, usaPiper, vozEhNatural, vozSuportada } from '../services/voz'

// Botão flutuante "Acessibilidade" (em todas as telas, inclusive no login) com tamanho da letra,
// alto contraste e voz.
const TEXTO_TESTE = 'Olá! Esta é a minha voz. Vou ler as explicações do sistema para você.'

// Disparado pela tela Configurações para abrir este painel.
export const ABRIR_ACESSIBILIDADE = 'suinonutri:acessibilidade'

const velocidades = [
  { v: 0.8, rotulo: 'Devagar' },
  { v: 0.95, rotulo: 'Normal' },
  { v: 1.1, rotulo: 'Rápida' },
]

const letras = [
  { id: 'normal', rotulo: 'A', dica: 'Letra normal' },
  { id: 'grande', rotulo: 'A+', dica: 'Letra grande' },
  { id: 'enorme', rotulo: 'A++', dica: 'Letra muito grande' },
]

export function PainelAcessibilidade() {
  const [aberto, setAberto] = useState(false)
  const [letra, setLetraEstado] = useState(getLetra)
  const [contraste, setContrasteEstado] = useState(getContraste)
  const [voz, setVozEstado] = useState(getVozAuto)
  const [vozes, setVozes] = useState(listarVozes)
  const [nomeVoz, setNomeVoz] = useState(() => (usaPiper() ? VOZ_PADRAO : getVozNome()))
  const [velocidade, setVelocidade] = useState(getVozVelocidade)
  const caixa = useRef(null)
  const botao = useRef(null)

  // as vozes do navegador carregam aos poucos: atualiza a lista quando chegarem
  useEffect(() => {
    if (!vozSuportada()) return undefined
    const atualizar = () => setVozes(listarVozes())
    window.speechSynthesis.addEventListener('voiceschanged', atualizar)
    atualizar()
    return () => window.speechSynthesis.removeEventListener('voiceschanged', atualizar)
  }, [])

  useEffect(() => {
    const abrir = () => setAberto(true)
    window.addEventListener(ABRIR_ACESSIBILIDADE, abrir)
    return () => window.removeEventListener(ABRIR_ACESSIBILIDADE, abrir)
  }, [])

  useEffect(() => {
    if (!aberto) return undefined
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false) }
    const esc = (e) => { if (e.key === 'Escape') { setAberto(false); botao.current?.focus() } }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  const escolherLetra = (id) => { setLetra(id); setLetraEstado(id) }
  const alternarContraste = () => { const novo = contraste === 'alto' ? 'normal' : 'alto'; setContraste(novo); setContrasteEstado(novo) }
  const escolherVoz = (nome) => { setVozNome(nome); setNomeVoz(nome); narrar('teste', TEXTO_TESTE) }
  const escolherVelocidade = (v) => { setVozVelocidade(v); setVelocidade(v); narrar('teste', TEXTO_TESTE) }
  const alternarVoz = () => {
    const novo = !voz
    setVozAuto(novo)
    setVozEstado(novo)
    if (novo) narrar('ligada', 'Voz ligada. As explicações do guia e da ajuda podem ser lidas em voz alta.')
    else parar()
  }

  return (
    <div className="acess" ref={caixa}>
      <button type="button" ref={botao} className="acess-botao" aria-expanded={aberto} aria-controls="painel-acess" onClick={() => setAberto(!aberto)}>
        <span aria-hidden>Aa</span>
        <span className="acess-botao-texto">Acessibilidade</span>
      </button>

      {aberto && (
        <div id="painel-acess" className="acess-painel" role="dialog" aria-label="Opções de acessibilidade">
          <h2>Acessibilidade</h2>

          <div className="acess-grupo" role="radiogroup" aria-label="Tamanho da letra">
            <p>Tamanho da letra</p>
            <div className="acess-letras">
              {letras.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={letra === l.id} aria-label={l.dica}
                  className={`acess-letra acess-letra-${l.id} ${letra === l.id ? 'ativo' : ''}`} onClick={() => escolherLetra(l.id)}>
                  {l.rotulo}
                </button>
              ))}
            </div>
          </div>

          <label className="acess-opcao">
            <input type="checkbox" checked={contraste === 'alto'} onChange={alternarContraste} />
            <span><b>Alto contraste</b><small>Cores mais fortes e bordas marcadas.</small></span>
          </label>

          {vozSuportada()
            ? (
              <label className="acess-opcao">
                <input type="checkbox" checked={voz} onChange={alternarVoz} />
                <span><b>Ler explicações em voz alta</b><small>O guia e a ajuda passam a ser lidos sozinhos.</small></span>
              </label>
            )
            : <p className="acess-nota">Este navegador não tem leitura em voz alta.</p>}

          {vozSuportada() && (
            <div className="acess-voz">
              <label className="acess-campo">
                <span>Voz</span>
                <select value={nomeVoz} onChange={(e) => escolherVoz(e.target.value)}>
                  <option value={VOZ_PADRAO}>Voz do SuínoNutri (padrão)</option>
                  {vozes.map((v) => <option key={v.name} value={v.name}>{v.name}{vozEhNatural(v) ? ' (natural)' : ''}</option>)}
                </select>
              </label>
              <div className="acess-grupo" role="radiogroup" aria-label="Velocidade da voz">
                <p>Velocidade da voz</p>
                <div className="acess-letras">
                  {velocidades.map((x) => (
                    <button key={x.v} type="button" role="radio" aria-checked={velocidade === x.v}
                      className={`acess-letra acess-vel ${velocidade === x.v ? 'ativo' : ''}`} onClick={() => escolherVelocidade(x.v)}>
                      {x.rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="btn-sec" onClick={() => narrar('teste', TEXTO_TESTE)}>▶ Testar a voz</button>
              {nomeVoz === VOZ_PADRAO && <p className="acess-nota">A voz do SuínoNutri lê o guia e as ajudas das telas. A leitura da receita usa a voz do seu navegador.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
