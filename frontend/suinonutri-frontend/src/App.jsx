import { useEffect, useState } from 'react'
import { AvisosProvider, useAvisos } from './components/Avisos'
import { Login } from './pages/Login'
import { Cadastro } from './pages/Cadastro'
import { Dashboard } from './pages/Dashboard'
import { NovaOtimizacao } from './pages/NovaOtimizacao'
import { Ingredientes } from './pages/Ingredientes'
import { Historico } from './pages/Historico'
import { Relatorios } from './pages/Relatorios'
import { Resultado } from './pages/Resultado'
import { getToken, registrarExpiracao, sair } from './services/api'

function Rotas() {
  const avisos = useAvisos()
  const [tela, setTela] = useState({ nome: getToken() ? 'dashboard' : 'login' })

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
    case 'historico':
      return <Historico {...comum} aoAbrir={(id) => ir('resultado', { id })} />
    case 'relatorios':
      return <Relatorios {...comum} aoAbrir={(id) => ir('resultado', { id })} />
    case 'resultado':
      return <Resultado {...comum} id={tela.id} />
    default:
      return <Dashboard {...comum} aoAbrir={(id) => ir('resultado', { id })} />
  }
}

function App() {
  return (
    <AvisosProvider>
      <Rotas />
    </AvisosProvider>
  )
}

export default App
