// Campo numérico pequeno com rótulo em cima.
export function Campo({ valor, aoMudar, rotulo, placeholder }) {
  return (
    <label className="mini">
      <span>{rotulo}</span>
      <input inputMode="decimal" value={valor} placeholder={placeholder} onChange={(e) => aoMudar(e.target.value)} />
    </label>
  )
}
