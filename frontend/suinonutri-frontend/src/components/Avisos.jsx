import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

// Avisos em "popup" (toast) para erros e sucessos, em qualquer tela:
//   const avisos = useAvisos()
//   avisos.erro('Texto')   avisos.sucesso('Texto')   avisos.info('Texto')
const Contexto = createContext(null)
const icones = { sucesso: '✓', erro: '!', info: 'i' }

export function AvisosProvider({ children }) {
  const [lista, setLista] = useState([])
  const proximo = useRef(1)

  const remover = useCallback((id) => setLista((l) => l.filter((a) => a.id !== id)), [])
  const mostrar = useCallback((tipo, texto, ms) => {
    const id = proximo.current++
    setLista((l) => [...l.slice(-2), { id, tipo, texto }])
    setTimeout(() => remover(id), ms)
  }, [remover])

  const api = useMemo(() => ({
    sucesso: (t) => mostrar('sucesso', t, 3500),
    erro: (t) => mostrar('erro', t, 7000),
    info: (t) => mostrar('info', t, 5000),
  }), [mostrar])

  return (
    <Contexto.Provider value={api}>
      {children}
      <div className="avisos" aria-live="polite">
        {lista.map((a) => (
          <div key={a.id} className={`toast ${a.tipo}`} role={a.tipo === 'erro' ? 'alert' : 'status'}>
            <span className="toast-icone">{icones[a.tipo]}</span>
            <span className="toast-texto">{a.texto}</span>
            <button className="toast-fechar" onClick={() => remover(a.id)} aria-label="Fechar aviso">×</button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export function useAvisos() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useAvisos precisa estar dentro de <AvisosProvider>')
  return contexto
}
