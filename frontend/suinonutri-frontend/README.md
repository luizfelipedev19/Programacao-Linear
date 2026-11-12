# SuínoNutri — Documentação do Front-end

> Otimização nutricional para suinocultura  
> Projeto de Extensão — Fatec • Versão 1.0 • Novembro de 2026 • Responsável pelo front-end: Samantha Marino • Backend: projeto Programacao-Linear


## 1. Visão geral

O **SuínoNutri** é um sistema web que calcula a **ração de suínos de menor custo** usando Programação Linear (método Simplex). Ele foi pensado para produtores e técnicos que **não precisam entender a matemática**: o usuário informa apenas os ingredientes disponíveis, os preços e as exigências nutricionais, e o sistema devolve a receita ideal, em porcentagem e em quilos, com o custo por kg.

Este documento descreve o **front-end** (a interface). O cálculo do Simplex, o banco de dados e a autenticação ficam no **backend** (projeto `Programacao-Linear`), que o front consome por API.

**Objetivos do front-end:**

- esconder a matemática: o usuário só preenche ingredientes, preços e exigências;
- mostrar o resultado de forma clara (receita em % e em kg, custo por kg);
- permitir cadastrar os próprios ingredientes e reaproveitá-los nas formulações;
- guardar o histórico e gerar relatórios (CSV e PDF);
- funcionar bem no computador e no celular.


## 2. Tecnologias

| Camada | Tecnologia | Para que serve |
| --- | --- | --- |
| Front-end | React + JavaScript | Telas e interação com o usuário |
| Build e servidor de desenvolvimento | Vite | Roda o projeto (`npm run dev`) e gera a versão final |
| Estilo | CSS puro (`index.css`) | Layout responsivo, sem biblioteca de componentes |
| Gráficos | SVG feito no próprio projeto | Gráfico de linha do custo, sem biblioteca externa |
| Backend | Node.js + Fastify | API REST e execução do Simplex |
| Banco de dados | MySQL | Usuários, ingredientes, formulações e resultados |
| Infraestrutura | Docker Compose | Sobe a API e o banco com um comando |
| Autenticação | JWT (token Bearer) | Mantém o usuário logado |


## 3. Como instalar e rodar

**Pré-requisitos:** Node.js (versão LTS) e Docker Desktop instalados. O Docker Desktop precisa estar aberto.


### Passo 1 — Ligar o backend

Abra um terminal **na pasta do backend** (`Programacao-Linear`, onde está o arquivo `docker-compose.yml`) e rode:

```
docker compose up --build
```

Quando aparecer que o servidor está rodando, confira no navegador `http://localhost:3000/health`: deve aparecer `{"status":"ok"}`. Deixe esse terminal aberto.


### Passo 2 — Ligar o front-end

Abra **outro** terminal, dentro da pasta do front (`frontend`, onde está o `package.json`), e rode:

```
npm install
npm run dev
```

O `npm install` só é necessário na primeira vez. Depois, abra `http://localhost:5173` no navegador.


### Configuração

O endereço da API fica na variável `VITE_API_URL`. O padrão é `http://localhost:3000`. Para mudar, copie `.env.example` para `.env` e edite. O front precisa rodar na porta **5173**, que é a liberada no CORS do backend.


### Comandos disponíveis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Roda o front em modo de desenvolvimento (atualiza sozinho ao salvar) |
| `npm run build` | Gera a versão final na pasta `dist` |
| `npm run preview` | Abre a versão gerada pelo build para conferir |


### Problemas comuns

| Mensagem ou sintoma | Causa | Solução |
| --- | --- | --- |
| "Não foi possível conectar ao servidor" | Backend desligado | Rode `docker compose up` na pasta do backend |
| `no configuration file provided: not found` (Docker) | Terminal na pasta errada | Entre na pasta que contém o `docker-compose.yml` |
| `Could not read package.json` (npm) | Terminal na pasta errada ou pasta duplicada | Entre na pasta que contém o `package.json` |
| A página não atualiza depois de editar | Cache do navegador | Aperte Ctrl + F5 |
| Erro de CORS no navegador | Front em porta diferente de 5173 | Feche o que usa a 5173 e rode `npm run dev` de novo |


## 4. Estrutura do projeto

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── .env.example              endereço da API
├── public/                   arquivos estáticos (favicon, imagens)
└── src/
    ├── main.jsx              ponto de entrada
    ├── App.jsx               controle de telas e da sessão
    ├── index.css             estilos de todas as telas
    ├── components/
    │   ├── Shell.jsx         moldura das telas logadas (menu lateral)
    │   ├── Topbar.jsx        barra do topo e menu no celular
    │   ├── navegacao.js      lista de destinos do menu
    │   ├── Avisos.jsx        popups de erro e sucesso
    │   ├── Campo.jsx         campo numérico com rótulo
    │   ├── GraficoCusto.jsx  gráfico de linha (SVG)
    │   ├── Hero.jsx          imagem da tela de login
    │   └── Logo.jsx          logo do sistema
    ├── pages/
    │   ├── Login.jsx
    │   ├── Cadastro.jsx
    │   ├── Dashboard.jsx
    │   ├── NovaOtimizacao.jsx
    │   ├── Ingredientes.jsx
    │   ├── Historico.jsx
    │   ├── Relatorios.jsx
    │   └── Resultado.jsx
    └── services/
        ├── api.js            todas as chamadas ao backend
        ├── formulacao.js     monta o problema de otimização
        └── formatos.js       formatação de moeda e porcentagem
```

O `App.jsx` guarda qual tela está aberta e redireciona para o login quando a sessão expira. Toda comunicação com o backend passa pelo `services/api.js`, o que facilita trocar o endereço ou ajustar uma rota em um único lugar.


## 5. Telas e funcionalidades


### 5.1 Login

O usuário entra com e-mail e senha (mínimo de 8 caracteres) e pode mostrar ou ocultar a senha. Erros e sucessos aparecem em popup, por exemplo "E-mail ou senha incorretos" e "Login realizado com sucesso." O link "Esqueceu sua senha?" ainda é apenas informativo.

![Tela de Login](docs/login.png)


### 5.2 Cadastro

Pede nome, e-mail, senha e confirmação de senha. Depois de cadastrar, o usuário **não entra direto**: é levado à tela de login, com o e-mail já preenchido e um aviso de sucesso.

![Tela de Cadastro](docs/cadastro.png)


### 5.3 Dashboard

Visão geral das formulações: total (com as novas do mês), economia média em relação à formulação anterior, custo médio por kg nos últimos 30 dias (com a variação em relação aos 30 dias anteriores), gráfico de evolução do custo nos últimos 6 meses e as formulações mais recentes. O botão "Nova Otimização" leva ao cálculo.

![Dashboard](docs/dashboard.png)


### 5.4 Ingredientes

Cadastro dos ingredientes do usuário (nome, preço por kg e composição: proteína, energia, fósforo, cálcio e lisina). É possível editar, excluir e buscar. Quem ainda não tem ingredientes pode adicionar uma lista de exemplo para suínos de 30 a 60 kg. Um ingrediente que já foi usado em uma formulação não pode ser excluído (regra do backend); o sistema explica o motivo.

![Tela de Ingredientes](docs/ingredientes.png)


### 5.5 Nova Otimização

A tela tem três etapas que **vêm fechadas** e abrem ao clicar, para a página ficar curta:

- **Nome da formulação;**
- **Ingredientes:** vêm do cadastro, todos desmarcados. O usuário marca os que tem, confere o preço e, em "Detalhes", ajusta a composição e os limites de uso na ração (mínimo e máximo em %);
- **Exigências nutricionais:** mínimo e máximo de proteína, energia, fósforo, cálcio e lisina.

Ao clicar em "Calcular ração de menor custo", o front monta o problema, envia ao backend, executa o Simplex e abre o resultado.

![Tela de Nova Otimização (etapas abertas)](docs/nova-otimizacao.png)


### 5.6 Resultado

Mostra o custo da ração por kg e a receita: percentual e quantidade em kg de cada ingrediente, com um campo para informar quantos kg se deseja produzir (o custo total é recalculado). Há uma conferência das exigências nutricionais. Se não existir ração possível, aparece uma mensagem em linguagem simples, com sugestões (liberar mais ingredientes ou ampliar as faixas).

![Tela de Resultado](docs/resultado.png)


### 5.7 Histórico

Lista de todas as formulações (as 50 mais recentes), com busca por nome ou código e filtro por status (Concluída, Em análise, Sem solução). Clicar em uma linha abre o resultado; também é possível excluir uma formulação.

![Tela de Histórico](docs/historico.png)


### 5.8 Relatórios

Resumo por período (todo o período, 30 ou 90 dias): quantidade de formulações, custo médio, menor e maior custo, variação do custo, gráfico do custo por formulação e os ingredientes mais usados (percentual médio na ração). O relatório pode ser baixado em **CSV** (abre no Excel, com a receita de cada formulação) ou impresso/salvo em **PDF** pelo navegador.

![Tela de Relatórios](docs/relatorios.png)


### 5.9 Layout responsivo

Em telas largas (900 px ou mais) aparece o menu lateral verde. Em telas estreitas, como celulares, o menu fica em uma barra no topo, aberta pelo avatar ou pelo ícone de menu. Em ambos há a opção **Sair da conta**.

![Versão para celular (Dashboard)](docs/mobile.png)


## 6. Comunicação com o backend

O front usa as rotas abaixo, todas centralizadas em `src/services/api.js`.

| Tela | Rota | Uso |
| --- | --- | --- |
| Login | `POST /auth/login` | Entrar; devolve o token (JWT) e os dados do usuário |
| Cadastro | `POST /auth/cadastro` | Criar conta (o front não inicia sessão: leva ao login) |
| Ingredientes | `GET /alimentos`, `POST /alimentos`, `PUT /alimentos/:id`, `DELETE /alimentos/:id` | Listar, cadastrar, editar e excluir ingredientes do usuário |
| Nova Otimização | `GET /alimentos` | Carregar os ingredientes cadastrados |
| Nova Otimização | `POST /problemas/completo` | Criar o problema inteiro (variáveis e restrições) de uma vez |
| Nova Otimização | `POST /problemas/:id/executar` | Executar o Simplex e salvar o resultado |
| Dashboard, Histórico e Relatórios | `GET /problemas`, `GET /problemas/:id/resultados` | Listar formulações e o último resultado de cada uma |
| Histórico | `DELETE /problemas/:id` | Excluir uma formulação |
| Resultado | `GET /problemas/:id`, `GET /problemas/:id/resultados`, `GET /problemas/:id/modelo` | Nome, receita calculada, preços e unidades das restrições |

**Autenticação:** ao entrar, o token JWT recebido é guardado no navegador (`localStorage`) e enviado em todas as chamadas no cabeçalho `Authorization: Bearer <token>`. Se o backend responder 401, o front apaga a sessão e volta para o login.

**Erros:** a mensagem enviada pelo backend (campo `erro`) é mostrada em popup. Quando a API não responde, aparece uma mensagem própria pedindo para verificar se o backend está rodando.


## 7. Como a otimização é montada

O usuário não vê a matemática, mas é o front que traduz o que ele preencheu para o formato que o backend espera (`POST /problemas/completo`). O problema é modelado com **uma variável para cada ingrediente**, que representa a **fração do ingrediente em 1 kg de ração**.

- **Função objetivo (minimizar):** a soma de preço × fração de cada ingrediente. Como as frações somam 1 kg, o valor ótimo já é o **custo por kg** da ração.
- **Exigências nutricionais:** cada mínimo vira uma restrição "maior ou igual" e cada máximo uma restrição "menor ou igual", usando o teor do nutriente em cada ingrediente. Ingredientes que não têm o nutriente ficam de fora da restrição.
- **Limites de uso por ingrediente:** os percentuais são convertidos em fração (15% vira 0,15). Se mínimo e máximo forem iguais, vira uma restrição de igualdade.
- **Soma das frações igual a 1:** garante que a receita feche 100% da ração.

O backend executa o Simplex e devolve a fração de cada ingrediente. O front multiplica por 100 para obter a porcentagem e pela quantidade desejada para obter os quilos. Por exemplo, uma fração de 0,60 significa 60% da ração, ou 120 kg em um lote de 200 kg.

**Status do resultado:** `OTIMO` aparece como "Concluída". `INVIAVEL` aparece como "Sem solução", com orientação para o usuário ajustar ingredientes ou exigências. Uma formulação ainda sem cálculo aparece como "Em análise".


## 8. Decisões de projeto

- **Linguagem simples para o usuário:** nada de variáveis, restrições ou tabelas do Simplex nas telas.
- **Avisos em popup:** erros e sucessos aparecem no topo da tela, em qualquer página, e somem sozinhos.
- **Etapas fechadas na Nova Otimização:** a tela fica curta e o usuário abre só o que precisa.
- **Ingredientes vindos do cadastro e desmarcados:** o que o usuário cadastra aparece na otimização, e ele escolhe o que usar em cada formulação.
- **Cadastro leva ao login:** o usuário entra de propósito, com a mensagem de sucesso.
- **JavaScript e CSS puros:** sem TypeScript, sem biblioteca de componentes e sem biblioteca de gráficos, para o código ser simples de ler e apresentar.
- **Layout responsivo:** a mesma interface se adapta ao computador e ao celular.


## 9. Roteiro de testes

Marque o resultado de cada teste depois de executá-lo.

| Nº | Teste | Resultado esperado | Resultado |
| --- | --- | --- | --- |
| 1 | Cadastro com senha de menos de 8 caracteres | Popup de erro explicando a regra | ☐ OK  ☐ Falhou |
| 2 | Cadastro válido | Popup de sucesso e vai para o login com o e-mail preenchido | ☐ OK  ☐ Falhou |
| 3 | Login com senha errada | Popup "E-mail ou senha incorretos" | ☐ OK  ☐ Falhou |
| 4 | Login válido | Popup "Login realizado com sucesso." e abre o Dashboard | ☐ OK  ☐ Falhou |
| 5 | Cadastrar um ingrediente | Aparece na lista e na Nova Otimização (desmarcado) | ☐ OK  ☐ Falhou |
| 6 | Excluir um ingrediente já usado em formulação | Aviso explicando que não pode ser excluído | ☐ OK  ☐ Falhou |
| 7 | Otimização com os ingredientes de exemplo | Resultado com custo por kg e receita somando 100% | ☐ OK  ☐ Falhou |
| 8 | Otimização impossível (ex.: só milho) | Mensagem de "Sem solução" em linguagem simples | ☐ OK  ☐ Falhou |
| 9 | Histórico: abrir e excluir uma formulação | Abre o resultado e remove da lista | ☐ OK  ☐ Falhou |
| 10 | Relatórios: baixar CSV e imprimir/PDF | Arquivo abre no Excel; PDF sem menus | ☐ OK  ☐ Falhou |
| 11 | Sair da conta | Volta ao login e exige entrar de novo | ☐ OK  ☐ Falhou |
| 12 | Janela estreita (celular) | Menu do topo funciona e as telas se ajustam | ☐ OK  ☐ Falhou |


## 10. Limitações e próximos passos

- **Recuperação de senha:** o backend não tem essa rota; o link da tela de login só informa isso.
- **Configurações:** a tela (trocar nome e senha) ainda não existe.
- **Limites de uso por ingrediente:** o cadastro do backend não guarda esses limites. Para os ingredientes de exemplo eles vêm como sugestão editável; para os demais o usuário informa em "Detalhes".
- **Histórico e relatórios:** consideram as 50 formulações mais recentes. O backend não tem uma rota de resumo, então o front consulta o resultado de cada formulação separadamente.
- **Economia:** é calculada comparando com a formulação anterior do próprio usuário, pois o backend não guarda um custo de referência.
- **Exigências nutricionais:** os valores padrão são os da fase de 30 a 60 kg do enunciado. Outras fases podem ser adicionadas depois.
- **Testes automatizados:** não existem; os testes foram feitos manualmente, pelo roteiro da seção 9.
- **Sessão:** o token fica no `localStorage`, adequado ao trabalho acadêmico. Em produção, o ideal é usar cookie `httpOnly`.
