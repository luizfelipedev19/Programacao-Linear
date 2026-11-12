import { useState } from 'react'
import { Hero } from '../components/Hero'
import { Logo } from '../components/Logo'
import { useAvisos } from '../components/Avisos'
import { cadastrar } from '../services/api'

// Depois de cadastrar, NÃO entra direto: vai para a tela de login.
export function Cadastro({ aoCadastrar, aoVoltar }) {
  const avisos = useAvisos()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (nome.trim().length < 2) return avisos.erro('Informe seu nome.')
    if (!email.includes('@')) return avisos.erro('Informe um e-mail válido.')
    if (senha.length < 8) return avisos.erro('A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== confirmar) return avisos.erro('As senhas não conferem. Digite a mesma senha nos dois campos.')
    setCarregando(true)
    try {
      await cadastrar(nome, email, senha)
      avisos.sucesso('Cadastro realizado com sucesso! Entre com seu e-mail e senha.')
      aoCadastrar(email.trim())
    } catch (err) {
      avisos.erro(err.status === 409 ? 'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.' : err.message)
      setCarregando(false)
    }
  }

  return (
    <div className="pagina-login">
      <div className="app-card login">
        <div className="login-hero"><Hero /></div>
        <form className="login-body" onSubmit={enviar} noValidate>
          <Logo />
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <div className="campo-input"><input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="name" /></div>
          </div>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <div className="campo-input"><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" autoComplete="email" /></div>
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha (mínimo 8 caracteres)</label>
            <div className="campo-input"><input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          </div>
          <div className="campo">
            <label htmlFor="confirmar">Confirmar senha</label>
            <div className="campo-input"><input id="confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          </div>
          <button className="btn-primario" type="submit" disabled={carregando}>{carregando ? 'Criando…' : 'Criar conta'}</button>
          <div className="cadastro" style={{ marginTop: 18 }}>
            Já tem conta?
            <button type="button" onClick={aoVoltar}>Voltar para o login</button>
          </div>
        </form>
      </div>
    </div>
  )
}
