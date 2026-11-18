import { useState } from 'react'
import { Shell } from '../components/Shell'
import { Ajuda } from '../components/Ajuda'
import { useAvisos } from '../components/Avisos'
import { ABRIR_GUIA } from '../components/Guia'
import { ABRIR_ACESSIBILIDADE } from '../components/PainelAcessibilidade'
import { alterarSenha, atualizarPerfil, excluirConta, exportarMeusDados, getUsuario } from '../services/api'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Entrada({ id, rotulo, tipo = 'text', valor, aoMudar, autoComplete, erro, dica }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-input">
        <input id={id} type={tipo} value={valor} autoComplete={autoComplete} aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${id}-erro` : undefined} onChange={(e) => aoMudar(e.target.value)} />
      </div>
      {dica && !erro && <small className="config-dica">{dica}</small>}
      {erro && <small id={`${id}-erro`} className="campo-erro" role="alert">{erro}</small>}
    </div>
  )
}

export function Configuracoes({ aoSair, aoNavegar, aoExcluirConta }) {
  const avisos = useAvisos()
  const atual = getUsuario()
  const [nome, setNome] = useState(atual?.nome ?? '')
  const [email, setEmail] = useState(atual?.email ?? '')
  const [errosPerfil, setErrosPerfil] = useState({})
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [errosSenha, setErrosSenha] = useState({})
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const [baixando, setBaixando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [senhaExcluir, setSenhaExcluir] = useState('')
  const [apagando, setApagando] = useState(false)

  const perfilIgual = nome.trim() === (atual?.nome ?? '') && email.trim().toLowerCase() === (atual?.email ?? '')

  async function salvarPerfil(e) {
    e.preventDefault()
    const erros = {}
    if (nome.trim().length < 2) erros.nome = 'Informe seu nome.'
    if (!EMAIL.test(email.trim())) erros.email = 'Informe um e-mail válido.'
    setErrosPerfil(erros)
    if (Object.keys(erros).length) return
    setSalvandoPerfil(true)
    try {
      const u = await atualizarPerfil(nome, email)
      setNome(u.nome)
      setEmail(u.email)
      avisos.sucesso('Dados atualizados.')
    } catch (err) {
      if (err.status === 409) setErrosPerfil({ email: 'Este e-mail já está em uso por outra conta.' })
      else avisos.erro(err.message)
    } finally { setSalvandoPerfil(false) }
  }

  async function salvarSenha(e) {
    e.preventDefault()
    const erros = {}
    if (!senhaAtual) erros.atual = 'Digite a senha atual.'
    if (novaSenha.length < 8) erros.nova = 'A nova senha precisa ter pelo menos 8 caracteres.'
    else if (novaSenha === senhaAtual) erros.nova = 'A nova senha precisa ser diferente da atual.'
    if (confirmar !== novaSenha) erros.confirmar = 'As senhas não conferem. Digite a mesma senha nos dois campos.'
    setErrosSenha(erros)
    if (Object.keys(erros).length) return
    setSalvandoSenha(true)
    try {
      await alterarSenha(senhaAtual, novaSenha)
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('')
      avisos.sucesso('Senha alterada. Use a nova senha no próximo acesso.')
    } catch (err) {
      if (err.status === 403) setErrosSenha({ atual: 'Senha atual incorreta.' })
      else avisos.erro(err.message)
    } finally { setSalvandoSenha(false) }
  }

  async function baixarDados() {
    setBaixando(true)
    try {
      const dados = await exportarMeusDados()
      const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `suinonutri-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      avisos.sucesso('Arquivo baixado.')
    } catch (err) { avisos.erro(err.message) } finally { setBaixando(false) }
  }

  async function apagarConta(e) {
    e.preventDefault()
    if (!senhaExcluir) return avisos.erro('Digite sua senha para confirmar.')
    setApagando(true)
    try {
      await excluirConta(senhaExcluir)
      aoExcluirConta()
    } catch (err) {
      avisos.erro(err.status === 403 ? 'Senha incorreta. A conta não foi excluída.' : err.message)
      setApagando(false)
    }
  }

  return (
    <Shell ativo="config" aoNavegar={aoNavegar} aoSair={aoSair}>
      <div className="dash-cabecalho">
        <div>
          <h1>Configurações</h1>
          <p className="sub">Aqui você cuida da sua conta: seus dados, a senha e como o sistema aparece e fala com você.</p>
        </div>
      </div>

      <Ajuda passos={[
        'Em "Meus dados" você troca seu nome e seu e-mail. O e-mail é o que você usa para entrar.',
        'Em "Senha", digite a senha atual e escolha uma nova, com pelo menos 8 caracteres.',
        'Em "Aparência e voz" você aumenta a letra, ativa o alto contraste ou liga a leitura em voz alta.',
        'Em "Seus dados no sistema" você baixa uma cópia de tudo o que cadastrou ou apaga a conta.',
      ]} dica="Apagar a conta remove tudo e não tem volta. Se tiver dúvida, baixe uma cópia dos dados antes." />

      <form className="card-branco" onSubmit={salvarPerfil} noValidate>
        <h2>Meus dados</h2>
        <Entrada id="cfg-nome" rotulo="Nome" valor={nome} aoMudar={setNome} autoComplete="name" erro={errosPerfil.nome} />
        <Entrada id="cfg-email" rotulo="E-mail (usado para entrar)" tipo="email" valor={email} aoMudar={setEmail} autoComplete="email" erro={errosPerfil.email} />
        <div className="form-botoes">
          <button type="submit" className="btn-topo" disabled={salvandoPerfil || perfilIgual}>{salvandoPerfil ? 'Salvando…' : 'Salvar dados'}</button>
        </div>
      </form>

      <form className="card-branco" onSubmit={salvarSenha} noValidate>
        <h2>Senha</h2>
        <Entrada id="cfg-atual" rotulo="Senha atual" tipo="password" valor={senhaAtual} aoMudar={setSenhaAtual} autoComplete="current-password" erro={errosSenha.atual} />
        <Entrada id="cfg-nova" rotulo="Nova senha" tipo="password" valor={novaSenha} aoMudar={setNovaSenha} autoComplete="new-password" erro={errosSenha.nova} dica="Mínimo de 8 caracteres." />
        <Entrada id="cfg-confirmar" rotulo="Confirmar nova senha" tipo="password" valor={confirmar} aoMudar={setConfirmar} autoComplete="new-password" erro={errosSenha.confirmar} />
        <div className="form-botoes">
          <button type="submit" className="btn-topo" disabled={salvandoSenha}>{salvandoSenha ? 'Salvando…' : 'Alterar senha'}</button>
        </div>
      </form>

      <section className="card-branco" aria-labelledby="cfg-aparencia">
        <h2 id="cfg-aparencia">Aparência e voz</h2>
        <p className="sub">Tamanho da letra, alto contraste e leitura em voz alta. O que você escolher fica lembrado neste navegador.</p>
        <div className="form-botoes">
          <button type="button" className="btn-sec" onClick={() => window.dispatchEvent(new Event(ABRIR_ACESSIBILIDADE))}>Aa Abrir opções de acessibilidade</button>
          <button type="button" className="btn-sec" onClick={() => window.dispatchEvent(new Event(ABRIR_GUIA))}>? Rever o guia do sistema</button>
        </div>
      </section>

      <section className="card-branco" aria-labelledby="cfg-dados">
        <h2 id="cfg-dados">Seus dados no sistema</h2>
        <p className="sub">Você pode baixar uma cópia de tudo o que cadastrou (ingredientes, restrições e formulações) ou apagar a conta.</p>
        <div className="form-botoes">
          <button type="button" className="btn-sec" onClick={baixarDados} disabled={baixando}>{baixando ? 'Preparando…' : '⬇ Baixar meus dados'}</button>
          <button type="button" className="btn-mini perigo" onClick={() => setExcluindo(!excluindo)} aria-expanded={excluindo}>Excluir minha conta</button>
        </div>

        {excluindo && (
          <form className="config-perigo" onSubmit={apagarConta} noValidate>
            <p><b>Atenção:</b> isto apaga sua conta, seus ingredientes, suas restrições e todas as formulações calculadas. <b>Não tem volta.</b></p>
            <Entrada id="cfg-excluir" rotulo="Digite sua senha para confirmar" tipo="password" valor={senhaExcluir} aoMudar={setSenhaExcluir} autoComplete="current-password" />
            <div className="form-botoes">
              <button type="submit" className="btn-perigo" disabled={apagando}>{apagando ? 'Excluindo…' : 'Excluir definitivamente'}</button>
              <button type="button" className="btn-sec" onClick={() => { setExcluindo(false); setSenhaExcluir('') }}>Cancelar</button>
            </div>
          </form>
        )}
      </section>
    </Shell>
  )
}
