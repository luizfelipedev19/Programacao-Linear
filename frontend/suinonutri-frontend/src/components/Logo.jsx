export function LogoIcone() {
  return null
}

export function Logo({ pequeno = false, subtitulo = false }) {
  return (
    <div className="logo" style={{ flexDirection: 'column', gap: 6 }}>
      <img src="/logo.png" alt="SuínoNutri" style={{ height: pequeno ? 50 : 100, width: 'auto' }} />
  
    </div>
  )
}
