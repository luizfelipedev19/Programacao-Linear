import { useId, useState } from 'react'

// Campo numérico pequeno com rótulo em cima. `erro` pinta a borda e mostra a mensagem logo abaixo.
// `ajuda` acrescenta um botão "?" que explica o campo em uma frase simples.
export function Campo({ valor, aoMudar, rotulo, placeholder, erro, ajuda }) {
  const [aberta, setAberta] = useState(false)
  const id = useId()
  const descricoes = [erro ? `${id}-erro` : null, ajuda && aberta ? `${id}-ajuda` : null].filter(Boolean).join(' ') || undefined
  return (
    <label className={`mini ${erro ? 'com-erro' : ''}`}>
      <span className="mini-rotulo">
        {rotulo}
        {ajuda && (
          <button type="button" className="dica-botao" aria-label={`O que é ${typeof rotulo === 'string' ? rotulo : 'este campo'}?`} aria-expanded={aberta}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberta(!aberta) }}>?</button>
        )}
      </span>
      {ajuda && aberta && <small id={`${id}-ajuda`} className="dica-balao" role="note">{ajuda}</small>}
      <input inputMode="decimal" value={valor} placeholder={placeholder} aria-invalid={Boolean(erro)} aria-describedby={descricoes}
        onChange={(e) => aoMudar(e.target.value)} />
      {erro && <small id={`${id}-erro`} className="campo-erro" role="alert">{erro}</small>}
    </label>
  )
}
