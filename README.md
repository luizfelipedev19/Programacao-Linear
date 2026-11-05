# API de Programação Linear

Backend Node.js para cadastro de cenários de formulação e resolução de modelos de Programação Linear. A API usa Fastify, MySQL e a biblioteca `javascript-lp-solver` (jsLPSolver).

## Stack

- Node.js com ES Modules
- Fastify e Swagger/OpenAPI
- MySQL (`mysql2`)
- `javascript-lp-solver`

## Configuração

1. Crie o banco executando o script `Projetolinear_BD.sql` fornecido pelo grupo.
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

As senhas nunca são armazenadas em texto puro: a API salva somente `senha_hash` gerado com `bcryptjs`. Cada problema criado recebe o `id_usuario` do token, e todas as operações sobre problema, variáveis, objetivo, restrições, duplicação, execução e resultados confirmam que ele pertence ao usuário autenticado. Alimentos formam um catálogo compartilhado e também exigem autenticação.

> Para uma instalação que já possua problemas antigos, a migration mantém `problema.id_usuario` inicialmente nulo. Esses registros não ficam acessíveis pela API autenticada até serem associados manualmente a um usuário no banco.

## Fluxo de cadastro e execução

1. Crie um problema com objetivo `MIN` ou `MAX`.
2. Cadastre as variáveis de decisão do problema.
3. Defina um coeficiente da função objetivo para cada variável aplicável.
4. Cadastre as restrições e seus coeficientes por variável.
5. Confira o modelo completo em `GET /problemas/:id/modelo`.
6. Execute em `POST /problemas/:id/executar`.
7. Consulte o histórico em `GET /problemas/:id/resultados`.

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
