import { useState } from 'react'
import { Hero } from '../components/Hero'
import { Logo } from '../components/Logo'
import { useAvisos } from '../components/Avisos'
import { entrar } from '../services/api'

export function Login({ aoEntrar, aoCadastrar, emailInicial = '' }) {
  const avisos = useAvisos()
  const [email, setEmail] = useState(emailInicial)
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!email.includes('@')) return avisos.erro('Informe um e-mail válido.')
    if (senha.length < 8) return avisos.erro('A senha deve ter pelo menos 8 caracteres.')
    setCarregando(true)
    try {
      await entrar(email, senha)
      avisos.sucesso('Login realizado com sucesso.')
      aoEntrar()
    } catch (err) {
      avisos.erro(err.status === 401 ? 'E-mail ou senha incorretos. Confira os dados e tente novamente.' : err.message)
      setCarregando(false)
    }
  }

  return (
    <main className="pagina-login" id="principal" tabIndex={-1}>
      <div className="app-card login">
        <div className="login-hero"><Hero /></div>
        <form className="login-body" onSubmit={enviar} noValidate>
          <h1 className="so-leitor">Entrar no SuínoNutri</h1>
          <Logo subtitulo />
          <p className="ajuda-login">Entre com o e-mail e a senha que você cadastrou. É a primeira vez? Toque em “Cadastre-se”, no fim da tela.</p>

          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <div className="campo-input">
              <input id="email" type="email" placeholder="seuemail@exemplo.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <div className="campo-input">
              <input id="senha" type={mostrar ? 'text' : 'password'} placeholder="••••••••••" value={senha}
                onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
              <button type="button" className="olho" onClick={() => setMostrar(!mostrar)}
                aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                  {mostrar && <path d="M3 3l18 18" />}
                </svg>
              </button>
            </div>
          </div>

          <button className="btn-primario" type="submit" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="link-verde"
            onClick={() => avisos.info('A recuperação de senha ainda não está disponível. Fale com o responsável pelo sistema.')}>
            Esqueceu sua senha?
          </button>
          <div className="cadastro">
            Ainda não tem conta?
            <button type="button" onClick={aoCadastrar}>Cadastre-se</button>
          </div>
        </form>
      </div>
    </main>
  )
}
