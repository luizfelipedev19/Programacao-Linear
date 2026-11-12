import { useEffect, useRef, useState } from 'react'
import { Logo } from './Logo'
import { destinos } from './navegacao'
import { getUsuario } from '../services/api'

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const iniciais = (nome) =>
  (nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')

// Barra do topo (telas estreitas) com menu: navegação + conta + sair.
// "extra" é um espaço para um botão da página (ex.: Voltar).
export function Topbar({ ativo, aoNavegar, aoSair, extra }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  const usuario = getUsuario()

  // fecha o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false)
    const esc = (e) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <header className="topbar">
      <Logo pequeno />
      <div className="topbar-acoes" ref={caixa}>
        {extra}
        <button className="avatar" onClick={() => setAberto(!aberto)} aria-label="Menu da conta" aria-expanded={aberto}>
          {iniciais(usuario?.nome)}
        </button>
        <button className="icone-btn" onClick={() => setAberto(!aberto)} aria-label="Menu">
          <svg width="26" height="26" viewBox="0 0 24 24" {...traco}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>

        {aberto && (
          <div className="menu-conta" role="menu">
            <div className="menu-usuario">
              <strong>{usuario?.nome ?? 'Usuário'}</strong>
              <span>{usuario?.email}</span>
            </div>
            {destinos.filter((d) => !d.emBreve).map((d) => (
              <button key={d.id} role="menuitem" className={ativo === d.id ? 'menu-ativo' : ''}
                onClick={() => { setAberto(false); aoNavegar(d.id) }}>
                {d.rotulo}
              </button>
            ))}
            <button role="menuitem" className="menu-sair" onClick={() => { setAberto(false); aoSair() }}>Sair da conta</button>
          </div>
        )}
      </div>
    </header>
  )
}
