import { getVozAuto } from '../services/acessibilidade'
import { hashTexto, narrar, parar, vozSuportada } from '../services/voz'

// Ajuda de cada tela, em passos curtos. Começa sempre fechada; o usuário abre quando quiser.
// Com a voz ligada no painel de acessibilidade, ao abrir ela é lida sozinha; o botão "Ouvir" lê quando a pessoa quiser.
export function Ajuda({ titulo = 'Como usar esta tela?', passos, dica }) {
  const texto = `${titulo} ${passos.map((p, i) => `Passo ${i + 1}. ${p}`).join(' ')}${dica ? ` Dica. ${dica}` : ''}`

  const ler = () => narrar(`ajuda-${hashTexto(texto)}`, texto)

  return (
    <details className="ajuda no-print" data-texto={texto} onToggle={(e) => {
      if (e.currentTarget.open) { if (vozSuportada() && getVozAuto()) ler() } else parar()
    }}>
      <summary><span className="ajuda-icone" aria-hidden>?</span>{titulo}</summary>
      {vozSuportada() && <p className="ajuda-ouvir"><button type="button" className="btn-mini" onClick={ler}>🔊 Ouvir</button></p>}
      <ol>{passos.map((p, i) => <li key={i}>{p}</li>)}</ol>
      {dica && <p className="ajuda-dica">{dica}</p>}
    </details>
  )
}
