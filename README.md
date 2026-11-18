# API de Programação Linear

Backend Node.js para cadastro de cenários de formulação e resolução de modelos de Programação Linear. A API usa Fastify, MySQL e a biblioteca `javascript-lp-solver` (jsLPSolver).

## Stack

- Node.js com ES Modules
- Fastify e Swagger/OpenAPI
- MySQL (`mysql2`)
- `javascript-lp-solver`

## Como rodar (Docker, recomendado)

Funciona em qualquer máquina com **Docker Desktop** (ou Docker Engine + Compose) e **Git**. Não precisa instalar Node nem MySQL.

```bash
git clone https://github.com/luizfelipedev19/Programacao-Linear.git
cd Programacao-Linear
cp .env.example .env        # no Windows (PowerShell): Copy-Item .env.example .env
# Edite o .env e troque o JWT_SECRET (mínimo de 32 caracteres); sem ele a API não inicia.
docker compose up --build
```

Na primeira execução o Docker baixa as imagens, cria o MySQL, executa `database/init/01-projetolinear_bd.sql`, roda as migrations (`npm run migrate`) e inicia a API. Quando aparecer `Server listening`, acesse:

| O quê | URL |
| --- | --- |
| **Swagger (documentação interativa)** | http://localhost:3000/docs |
| Verificação da API e do banco | http://localhost:3000/health |
| Especificação OpenAPI (JSON, para Postman) | http://localhost:3000/docs/json |

Para rodar em segundo plano use `docker compose up -d --build` e acompanhe com `docker compose logs -f backend`. Para parar: `docker compose down`.

### Testando no Swagger

1. Em **Autenticação**, execute `POST /auth/cadastro` (nome, e-mail e senha com 8+ caracteres) e depois `POST /auth/login`.
2. Copie o `token` da resposta, clique em **Authorize** (cadeado no topo) e cole **apenas o token**, sem `Bearer`.
3. Siga o fluxo da seção [Fluxo de cadastro e execução](#fluxo-de-cadastro-e-execução).

### Problemas comuns

- **Porta 3306 ou 3000 em uso:** altere `MYSQL_PORT` ou `BACKEND_PORT` no `.env`.
- **Erro `Cannot find package` depois de um `git pull`:** o `package.json` mudou e o container usa um `node_modules` próprio. Reconstrua com `docker compose up -d --build --renew-anon-volumes backend`.
- **Alterei o SQL do banco e nada mudou:** os scripts de `database/init` só rodam quando o volume do banco é criado. Para recriar o banco do zero (**apaga todos os dados**): `docker compose down -v` e depois `docker compose up --build`.
- **Mudei o código e a API não atualizou:** em alguns Windows o `--watch` não detecta alterações em volume montado. Use `docker compose restart backend`.

## Configuração manual (sem Docker)

1. Crie o banco executando o script `database/init/01-projetolinear_bd.sql`.
2. Instale as dependências:

```bash
npm ci
```

3. Defina as variáveis de ambiente conforme necessário:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=projeto_linear
DB_USER=root
DB_PASSWORD=qualquercoisa
PORT=3000
JWT_SECRET=uma-chave-longa-e-aleatoria
```

4. Execute as migrations de autenticação. Elas criam a tabela `usuario`, vinculam `problema.id_usuario` e registram o histórico em `schema_migrations`:

```bash
npm run migrate
```

5. Inicie a API:

```bash
npm run dev
```

A documentação interativa estará em `http://localhost:3000/docs` e a verificação de conexão em `GET /health`.

## Autenticação e propriedade dos dados

Todas as rotas de alimentos e problemas exigem um token JWT, exceto `GET /health` e as rotas de autenticação. O token deve ser enviado pelo front-end em todas as requisições protegidas:

```http
Authorization: Bearer <token>
```

| Rota | Uso |
| --- | --- |
| `POST /auth/cadastro` | Cria um usuário com `nome`, `email` e `senha` (mínimo de 8 caracteres). |
| `POST /auth/login` | Autentica e retorna um JWT válido por 8 horas. |
| `GET /auth/perfil` | Retorna os dados do usuário autenticado. |

As senhas nunca são armazenadas em texto puro: a API salva somente `senha_hash` gerado com `bcryptjs`. Cada problema criado recebe o `id_usuario` do token, e todas as operações sobre problema, variáveis, objetivo, restrições, duplicação, execução e resultados confirmam que ele pertence ao usuário autenticado. Os alimentos também pertencem ao usuário que os cadastrou: cada usuário só lista, altera, exclui e usa nas variáveis os seus próprios alimentos (acessar o de outro retorna 404).

> Para uma instalação que já possua problemas antigos, a migration mantém `problema.id_usuario` inicialmente nulo. Esses registros não ficam acessíveis pela API autenticada até serem associados manualmente a um usuário no banco.

## Segurança

| Controle | Como funciona |
| --- | --- |
| Segredo do JWT | `JWT_SECRET` é obrigatório (mínimo de 32 caracteres); a API não inicia sem ele. Em `NODE_ENV=production` o valor de exemplo também é recusado. O algoritmo é fixado em HS256. |
| Senhas | Hash bcrypt (custo 12); tamanho de 8 a 72 caracteres. O login leva o mesmo tempo para e-mail inexistente e senha errada. |
| Rate limit | Por IP: 300 requisições/min no geral, 10 tentativas de login/min, 10 cadastros/hora e 30 execuções do solver/min. Excedeu: `429`. Ajustável por variáveis `RATE_LIMIT_*`. |
| IDOR | Problemas e alimentos pertencem a um usuário; toda consulta filtra por `id_usuario`. Recurso de outro usuário responde `404`. A variável só pode usar alimento do próprio usuário. |
| CORS | Só as origens de `CORS_ORIGIN` (padrão `http://localhost:5173`, o Vite). Separe várias origens por vírgula. |
| Cabeçalhos | `@fastify/helmet` (nosniff, frame-options, HSTS etc.). |
| Contra abuso/DoS | Corpo máximo de 100 KB, timeouts de 30 s, solver limitado a 200 variáveis, 500 restrições e 10 s, histórico limitado a 100 resultados. |
| Mass assignment | Os schemas descartam campos não previstos (ex.: `id_usuario` enviado no corpo é ignorado). |
| Logs e erros | O cabeçalho `Authorization` é omitido dos logs; erros 500 não expõem detalhes. |
| Docker | O contêiner roda como usuário `node` (não root) e as portas 3000 e 3306 só abrem em `127.0.0.1`. |
| Swagger | Desligado com `NODE_ENV=production` (a menos que `SWAGGER_ENABLED=true`). |

Para produção: defina `NODE_ENV=production`, um `JWT_SECRET` forte (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`), `CORS_ORIGIN` com o endereço real do front-end, use HTTPS atrás de um proxy reverso e só então `TRUST_PROXY=true`.

## Fluxo de cadastro e execução

1. Crie um problema com objetivo `MIN` ou `MAX`.
2. Cadastre as variáveis de decisão do problema.
3. Defina um coeficiente da função objetivo para cada variável aplicável.
4. Cadastre as restrições e seus coeficientes por variável.
5. Confira o modelo completo em `GET /problemas/:id/modelo`.
6. Execute em `POST /problemas/:id/executar`.
7. Consulte o histórico em `GET /problemas/:id/resultados`.

### Restrições nutricionais cadastradas

`/exigencias` (GET, POST, PUT, DELETE) guarda as restrições (mínimo e/ou máximo de um nutriente) que o usuário reutiliza nas formulações; aparece como **Restrições** no menu do front-end. Cada restrição é de um nutriente padrão (`proteina`, `energia`, `fosforo`, `calcio` ou `lisina`, com os teores vindos do cadastro de alimentos) ou de um nutriente próprio, com `teores` informados por ingrediente. São privadas por usuário (recurso de outro usuário responde `404`), com nome único e limite de 100 por usuário. Criada pela migration `004_create_exigencia.sql`.

### Cadastro completo em uma única chamada

`POST /problemas/completo` cria o problema inteiro de uma vez (problema, variáveis, função objetivo, restrições com coeficientes e, opcionalmente, os alimentos), em uma só transação: se qualquer parte for inválida, nada é gravado. As variáveis e restrições se relacionam **pelo nome**:

```json
{
  "nome": "Mistura simples",
  "objetivo": "MIN",
  "alimentos": [
    { "nome": "Milho", "proteina": 8.51, "energia": 3493, "fosforo": 0.27, "calcio": 0.02, "lisina": 0.23, "custo_kg": 1.8 },
    { "nome": "Farinha de soja", "proteina": 45.6, "energia": 3378, "fosforo": 0.55, "calcio": 0.36, "lisina": 2.87, "custo_kg": 4.2 }
  ],
  "variaveis": [
    { "nome": "Milho", "alimento": "Milho", "coeficiente_objetivo": 1.8 },
    { "nome": "Farinha de soja", "alimento": "Farinha de soja", "coeficiente_objetivo": 4.2 }
  ],
  "restricoes": [
    { "nome": "Proteina minima", "sinal": ">=", "valor": 15.5, "coeficientes": { "Milho": 8.51, "Farinha de soja": 45.6 } },
    { "nome": "Soma das fracoes", "sinal": "=", "valor": 1, "coeficientes": { "Milho": 1, "Farinha de soja": 1 } }
  ]
}
```

Em `coeficientes`, a variável que não aparece vale 0. O campo `alimentos` é opcional; um alimento seu com o mesmo nome é reaproveitado sem alteração. No Swagger, essa rota já vem preenchida com o problema da ração. Em seguida, execute com `POST /problemas/{id}/executar`.

## Solver e resultados

`POST /problemas/:id/executar` obtém o modelo por meio de `carregarProblema(id)` e o transforma para o formato aceito pelo jsLPSolver:

- `MIN` e `MAX` são convertidos para `min` e `max`;
- `<=`, `>=` e `=` são convertidos, respectivamente, para limites `max`, `min` e `equal`;
- variáveis marcadas como `inteira` são resolvidas como inteiras;
- os identificadores internos do solver usam os IDs do banco, evitando conflitos com nomes fornecidos pelo usuário.

Após a execução, a API retorna e persiste um dos status abaixo:

| Status | Significado | Dados filhos persistidos |
| --- | --- | --- |
| `OTIMO` | Uma solução ótima foi encontrada. | Valores das variáveis e verificações das restrições. |
| `INVIAVEL` | Nenhuma solução atende às restrições. | Nenhum. |
| `ILIMITADO` | A função objetivo melhora sem limite. | Nenhum. |
| `ERRO` | O solver lançou um erro inesperado. | Nenhum. |

Para resultados `OTIMO`, cada restrição contém:

- `valor_calculado`: soma de `coeficiente × valor da variável`;
- `folga`: sobra para `<=`, excedente para `>=` e diferença absoluta para `=`;
- `atendida`: validação numérica usando tolerância de `0.000001`.

As três tabelas de persistência são gravadas na mesma transação: `resultado`, `resultado_variavel` e `resultado_restricao`. Se qualquer inserção falhar, toda a execução é desfeita.

## Rotas do solver

### Executar problema

`POST /problemas/:id/executar`

Executa e armazena uma nova tentativa. Respostas possíveis:

- `201`: execução armazenada, incluindo `status`, `valor_objetivo`, `variaveis` e `restricoes` quando o status é `OTIMO`;
- `400`: ID ou estrutura do modelo inválida;
- `404`: problema não encontrado;
- `500`: erro inesperado na resolução ou persistência.

Exemplo de resposta ótima:

```json
{
  "id_resultado": 1,
  "id_problema": 1,
  "valor_objetivo": 125.5,
  "status": "OTIMO",
  "data_calculo": "2026-11-05T17:00:00.000Z",
  "variaveis": [
    { "id_variavel": 1, "nome": "milho", "valor": 10 }
  ],
  "restricoes": [
    {
      "id_restricao": 1,
      "nome": "Proteína mínima",
      "sinal": ">=",
      "valor_restricao": 20,
      "valor_calculado": 20,
      "folga": 0,
      "atendida": true
    }
  ]
}
```

### Consultar histórico

`GET /problemas/:id/resultados`

Retorna as execuções do problema da mais recente para a mais antiga. Uma execução sem solução ótima terá os arrays `variaveis` e `restricoes` vazios e `valor_objetivo` igual a `null`.

## Estrutura adicionada para o solver

```text
src/
├── controllers/resultadosController.js
├── repositories/resultadosRepository.js
├── routes/resultadosRoutes.js
└── services/solverService.js
```

Esses arquivos são independentes das rotas de cadastro. A única integração é a leitura do modelo pronto por `carregarProblema(id)`.
