import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getUsuario } from '../services/api'
import { getVozAuto, setVozAuto } from '../services/acessibilidade'
import { narrar, parar, vozSuportada } from '../services/voz'
import { passos } from './guiaPassos'

// Guia passo a passo: boas-vindas no primeiro acesso de cada usuário e, se ele quiser, um tour que
// destaca cada parte do sistema. Também abre pelo botão "Guia do sistema" (evento 'suinonutri:guia').
export const ABRIR_GUIA = 'suinonutri:guia'

const chaveVisto = (u) => `suinonutri_guia_${u?.id_usuario ?? 'anonimo'}`
const jaVisto = (u) => {
  try { return localStorage.getItem(chaveVisto(u)) === '1' } catch { return true } // sem armazenamento: não insiste
}
const marcarVisto = (u) => {
  try { localStorage.setItem(chaveVisto(u), '1') } catch { /* só não lembra */ }
}

const MARGEM = 10
const LARGURA_CARTAO = 420

// Acha o primeiro elemento visível com esse data-guia (o menu, por exemplo, existe no desktop e no celular).
function acharAlvo(nome) {
  for (const el of document.querySelectorAll(`[data-guia="${nome}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

export function Guia({ tela, aoNavegar }) {
  const usuario = getUsuario()
  const [fase, setFase] = useState('fechado') // fechado | boasvindas | passo
  const [i, setI] = useState(0)
  const [alvo, setAlvo] = useState(null)
  const [rect, setRect] = useState(null)
  const [alturaCartao, setAlturaCartao] = useState(240)
  const cartao = useRef(null)
  const botaoProximo = useRef(null)
  const [voz, setVoz] = useState(getVozAuto)

  // primeiro acesso deste usuário: mostra as boas-vindas
  useEffect(() => {
    if (!jaVisto(usuario)) setFase('boasvindas')
  }, [])

  // botão "Guia do sistema"
  useEffect(() => {
    const abrir = () => { setI(0); setFase('boasvindas') }
    window.addEventListener(ABRIR_GUIA, abrir)
    return () => window.removeEventListener(ABRIR_GUIA, abrir)
  }, [])

  const encerrar = useCallback(() => {
    marcarVisto(usuario)
    setFase('fechado')
    setAlvo(null)
    setRect(null)
    if (tela !== 'dashboard') aoNavegar('dashboard')
  }, [tela, aoNavegar, usuario])

  const p = passos[i]
  const nomeUsuario = usuario?.nome?.split(' ')[0] ?? ''
  const textoBoasVindas = `Bem-vindo ao SuínoNutri${nomeUsuario ? `, ${nomeUsuario}` : ''}! O SuínoNutri calcula a ração de menor custo para os seus suínos, respeitando o que eles precisam comer. Quer um passeio guiado? É rápido e mostra, passo a passo, o que é cada parte do sistema.`
  const textoPasso = `${p.titulo}. ${p.texto}`
  const lerAtual = () => (fase === 'boasvindas' ? narrar('boasvindas', textoBoasVindas) : narrar(`passo-${i}`, textoPasso))

  // voz: lê o texto de cada passo quando a leitura automática está ligada; ao fechar o guia, silencia
  useEffect(() => {
    if (fase === 'fechado') { parar(); return }
    if (voz) lerAtual()
  }, [fase, i, voz])
  useEffect(() => parar, [])

  const ligarVoz = (ligada) => { setVozAuto(ligada); setVoz(ligada); if (!ligada) parar() }

  // leva o usuário até a tela do passo e procura o elemento a destacar (espera a tela carregar)
  useEffect(() => {
    if (fase !== 'passo') return undefined
    if (p.tela && p.tela !== tela) { aoNavegar(p.tela); return undefined }
    let tentativas = 0
    let cancelado = false
    let timer
    const procurar = () => {
      if (cancelado) return
      const el = p.alvo ? acharAlvo(p.alvo) : null
      if (el) {
        if (window.innerWidth < 700) {
          // celular: o cartão ocupa a parte de baixo, então o destaque sobe para o topo da tela
          window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 90, behavior: 'smooth' })
        } else {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
        setAlvo(el)
      } else if (p.alvo && tentativas++ < 20) {
        timer = setTimeout(procurar, 100)
      } else {
        setAlvo(null)
        setRect(null)
      }
    }
    setAlvo(null)
    setRect(null)
    procurar()
    return () => { cancelado = true; clearTimeout(timer) }
  }, [fase, i, tela])

  // acompanha a posição do elemento (rolagem, redimensionamento, conteúdo que carrega)
  useEffect(() => {
    if (!alvo) return undefined
    const medir = () => {
      const r = alvo.getBoundingClientRect()
      setRect((a) => (a && a.top === r.top && a.left === r.left && a.width === r.width && a.height === r.height ? a : { top: r.top, left: r.left, width: r.width, height: r.height }))
    }
    medir()
    const id = setInterval(medir, 120)
    window.addEventListener('resize', medir)
    return () => { clearInterval(id); window.removeEventListener('resize', medir) }
  }, [alvo])

  // teclado: → ou Enter avançam, ← volta, Esc fecha
  useEffect(() => {
    if (fase === 'fechado') return undefined
    const tecla = (e) => {
      if (e.key === 'Escape') encerrar()
      else if (fase === 'passo' && e.key === 'ArrowRight') avancar()
      else if (fase === 'passo' && e.key === 'ArrowLeft') voltar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  // foco no botão principal a cada passo (leitores de tela e teclado)
  useEffect(() => {
    if (fase !== 'fechado') botaoProximo.current?.focus({ preventScroll: true })
  }, [fase, i])

  useLayoutEffect(() => {
    if (cartao.current) setAlturaCartao(cartao.current.offsetHeight)
  }, [fase, i, rect === null])

  function avancar() {
    if (i >= passos.length - 1) encerrar()
    else setI(i + 1)
  }
  function voltar() { if (i > 0) setI(i - 1) }

  if (fase === 'fechado') return null

  if (fase === 'boasvindas') {
    const nome = usuario?.nome?.split(' ')[0] ?? ''
    return (
      <div className="guia-fundo" role="presentation">
        <div className="guia-cartao guia-central" role="dialog" aria-modal="true" aria-labelledby="guia-titulo" ref={cartao}>
          <p className="guia-emoji" aria-hidden>🐖</p>
          <h2 id="guia-titulo">Bem-vindo{nome ? `, ${nome}` : ''}!</h2>
          <p className="guia-texto">O SuínoNutri calcula a ração de menor custo para os seus suínos, respeitando o que eles precisam comer.</p>
          <p className="guia-texto">Quer um <b>passeio guiado</b>? É rápido e mostra, passo a passo, o que é cada parte do sistema.</p>
          <div className="guia-botoes">
            <button type="button" className="btn-topo" ref={botaoProximo} onClick={() => { setI(0); setFase('passo') }}>Sim, quero o guia</button>
            {vozSuportada() && <button type="button" className="btn-sec" onClick={() => { ligarVoz(true); setI(0); setFase('passo') }}>Sim, com voz 🔊</button>}
            <button type="button" className="btn-sec" onClick={encerrar}>Agora não</button>
          </div>
          {vozSuportada() && <p className="guia-voz-linha"><button type="button" className="btn-mini" onClick={lerAtual}>🔊 Ouvir esta mensagem</button></p>}
          <p className="guia-nota">Você pode abrir o guia quando quiser, no botão “Guia do sistema”, no menu.</p>
        </div>
      </div>
    )
  }

  // posição do cartão: abaixo, acima, à direita ou à esquerda do destaque; no celular (ou sem espaço), embaixo da tela
  const vw = window.innerWidth
  const vh = window.innerHeight
  const largura = Math.min(LARGURA_CARTAO, vw - 24)
  let estilo = { left: (vw - largura) / 2, bottom: 16, width: largura }
  if (rect && vw >= 700) {
    const espacoAbaixo = vh - (rect.top + rect.height) - MARGEM * 2
    const espacoAcima = rect.top - MARGEM * 2
    const espacoDireita = vw - (rect.left + rect.width) - MARGEM * 2
    const espacoEsquerda = rect.left - MARGEM * 2
    const alinhado = Math.min(Math.max(rect.left, 12), vw - largura - 12)
    if (espacoAbaixo >= alturaCartao) estilo = { top: rect.top + rect.height + MARGEM + 6, left: alinhado, width: largura }
    else if (espacoAcima >= alturaCartao) estilo = { top: rect.top - MARGEM - 6 - alturaCartao, left: alinhado, width: largura }
    else if (espacoDireita >= largura) estilo = { top: Math.min(Math.max(rect.top, 12), vh - alturaCartao - 12), left: rect.left + rect.width + MARGEM + 6, width: largura }
    else if (espacoEsquerda >= largura) estilo = { top: Math.min(Math.max(rect.top, 12), vh - alturaCartao - 12), left: rect.left - MARGEM - 6 - largura, width: largura }
  }
  const centralizado = !rect
  if (centralizado) estilo = { top: '50%', left: '50%', width: largura, transform: 'translate(-50%, -50%)' }

  const ultimo = i === passos.length - 1
  const progresso = ((i + 1) / passos.length) * 100

  return (
    <div className="guia-fundo guia-passo" role="presentation">
      {rect
        ? <div className="guia-destaque" style={{ top: rect.top - MARGEM, left: rect.left - MARGEM, width: rect.width + MARGEM * 2, height: rect.height + MARGEM * 2 }} />
        : <div className="guia-escurecer" />}
      <div className="guia-cartao" style={estilo} role="dialog" aria-modal="true" aria-labelledby="guia-titulo" aria-describedby="guia-desc" ref={cartao}>
        <div className="guia-topo">
          <span className="guia-contador">Passo {i + 1} de {passos.length}</span>
          <button type="button" className="guia-pular" onClick={encerrar}>Pular guia</button>
        </div>
        <div className="guia-barra" aria-hidden><div style={{ width: `${progresso}%` }} /></div>
        <h2 id="guia-titulo">{p.titulo}</h2>
        <p id="guia-desc" className="guia-texto" aria-live="polite">{p.texto}</p>
        {vozSuportada() && (
          <div className="guia-voz">
            <button type="button" className="btn-mini" onClick={lerAtual}>🔊 Ouvir de novo</button>
            <label className="guia-voz-opcao"><input type="checkbox" checked={voz} onChange={(e) => ligarVoz(e.target.checked)} /> Ler cada passo em voz alta</label>
          </div>
        )}
        <div className="guia-botoes">
          {i > 0 && <button type="button" className="btn-sec" onClick={voltar}>← Voltar</button>}
          <button type="button" className="btn-topo" ref={botaoProximo} onClick={avancar}>{ultimo ? 'Concluir' : 'Próximo →'}</button>
        </div>
      </div>
    </div>
  )
}
