import { useEffect, useState } from 'react'
import { AvisosProvider, useAvisos } from './components/Avisos'
import { Login } from './pages/Login'
import { Cadastro } from './pages/Cadastro'
import { Dashboard } from './pages/Dashboard'
import { NovaOtimizacao } from './pages/NovaOtimizacao'
import { Ingredientes } from './pages/Ingredientes'
import { Restricoes } from './pages/Restricoes'
import { Historico } from './pages/Historico'
import { Relatorios } from './pages/Relatorios'
import { Resultado } from './pages/Resultado'
import { Configuracoes } from './pages/Configuracoes'
import { Guia } from './components/Guia'
import { PainelAcessibilidade } from './components/PainelAcessibilidade'
import { getToken, registrarExpiracao, sair } from './services/api'

const titulos = {
  login: 'Entrar', cadastro: 'Criar conta', dashboard: 'Dashboard', nova: 'Nova Otimização',
  ingredientes: 'Ingredientes', restricoes: 'Restrições', historico: 'Histórico de otimizações',
  relatorios: 'Relatórios', resultado: 'Resultado', config: 'Configurações',
}

function Rotas() {
  const avisos = useAvisos()
  const [tela, setTela] = useState({ nome: getToken() ? 'dashboard' : 'login' })

  // a cada tela: título da aba e foco no título da página (leitores de tela anunciam onde a pessoa está)
  useEffect(() => {
    document.title = `${titulos[tela.nome] ?? 'SuínoNutri'} • SuínoNutri`
    const t = setTimeout(() => {
      if (document.querySelector('.guia-fundo')) return
      const h = document.querySelector('main h1')
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) }
    }, 80)
    return () => clearTimeout(t)
  }, [tela.nome])

  // se o token expirar (401), volta para o login
  useEffect(() => registrarExpiracao(() => setTela({ nome: 'login' })), [])

  const ir = (nome, extra = {}) => {
    setTela({ nome, ...extra })
    window.scrollTo(0, 0)
  }
  const sairDaConta = () => {
    sair()
    ir('login')
    avisos.info('Você saiu da conta.')
  }
  // props comuns das telas logadas
  const comum = { aoSair: sairDaConta, aoNavegar: ir }

  const telaAtual = () => {
    switch (tela.nome) {
      case 'login':
        return <Login emailInicial={tela.email} aoEntrar={() => ir('dashboard')} aoCadastrar={() => ir('cadastro')} />
      case 'cadastro':
        // depois de cadastrar, vai para o LOGIN (não entra direto)
        return <Cadastro aoCadastrar={(email) => ir('login', { email })} aoVoltar={() => ir('login')} />
      case 'nova':
        return <NovaOtimizacao {...comum} aoConcluir={(id) => ir('resultado', { id })} />
      case 'ingredientes':
        return <Ingredientes {...comum} />
      case 'restricoes':
        return <Restricoes {...comum} />
      case 'historico':
        return <Historico {...comum} aoAbrir={(id) => ir('resultado', { id })} />
      case 'relatorios':
        return <Relatorios {...comum} aoAbrir={(id) => ir('resultado', { id })} />
      case 'config':
        return <Configuracoes {...comum} aoExcluirConta={() => { ir('login'); avisos.info('Sua conta foi excluída.') }} />
      case 'resultado':
        return <Resultado {...comum} id={tela.id} />
      default:
        return <Dashboard {...comum} aoAbrir={(id) => ir('resultado', { id })} />
    }
  }

  const logado = tela.nome !== 'login' && tela.nome !== 'cadastro'
  return (
    <>
      {telaAtual()}
      {logado && <Guia tela={tela.nome} aoNavegar={ir} />}
    </>
  )
}

function App() {
  return (
    <AvisosProvider>
      <a className="pular-conteudo" href="#principal" onClick={(e) => { e.preventDefault(); document.getElementById('principal')?.focus() }}>Pular para o conteúdo</a>
      <Rotas />
      <PainelAcessibilidade />
    </AvisosProvider>
  )
}

export default App
