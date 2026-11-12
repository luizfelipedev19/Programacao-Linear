import { Logo } from './Logo'
import { Topbar } from './Topbar'
import { destinos } from './navegacao'
import { getUsuario } from '../services/api'

const ic = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const icones = {
  dashboard: <svg {...ic}><path d="M12 3a9 9 0 1 0 9 9h-9V3Z" /><path d="M15 3.5A9 9 0 0 1 20.500 9H15V3.500Z" /></svg>,
  nova: <svg {...ic}><path d="M10 3l1.800 5.200L17 10l-5.200 1.800L10 17l-1.800-5.200L3 10l5.200-1.800L10 3ZM18 14l.9 2.100L21 17l-2.100.9L18 20l-.9-2.100L15 17l2.100-.9L18 14Z" /></svg>,
  ingredientes: <svg {...ic}><path d="M12 21V9M12 9c0-3 2-5 5-5 0 3-2 5-5 5ZM12 9c0-3-2-5-5-5 0 3 2 5 5 5ZM12 15c0-3 2-5 5-5 0 3-2 5-5 5ZM12 15c0-3-2-5-5-5 0 3 2 5 5 5Z" /></svg>,
  historico: <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  relatorios: <svg {...ic}><rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="7" width="4" height="13" rx="1" /><rect x="16" y="3" width="4" height="17" rx="1" /></svg>,
  config: <svg {...ic}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100 7 17M17 7l2.100-2.100" /></svg>,
}

const iniciais = (nome) =>
  (nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')

// Moldura das telas logadas.
// Telas largas (computador): menu lateral verde + conteúdo.
// Telas estreitas (celular): barra do topo com menu da conta, como antes.
export function Shell({ ativo, aoNavegar, aoSair, extra, children }) {
  const usuario = getUsuario()

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo pequeno claro />
        <nav>
          {destinos.map((i) => (
            <button key={i.id} className={`nav-item ${ativo === i.id ? 'ativo' : ''}`} disabled={i.emBreve}
              onClick={() => aoNavegar(i.id)} title={i.emBreve ? 'Em breve' : undefined}>
              {icones[i.id]}
              <span>{i.rotulo}</span>
              {i.emBreve && <small>em breve</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-usuario">
          <div className="usuario-linha">
            <span className="avatar-claro">{iniciais(usuario?.nome)}</span>
            <div>
              <strong>{usuario?.nome ?? 'Usuário'}</strong>
              <span>{usuario?.email}</span>
            </div>
          </div>
          <button className="sair-lateral" onClick={aoSair}>Sair da conta</button>
        </div>
      </aside>

      <div className="conteudo">
        <div className="app-card dash">
          <Topbar ativo={ativo} aoNavegar={aoNavegar} aoSair={aoSair} extra={extra} />
          {children}
        </div>
      </div>
    </div>
  )
}
