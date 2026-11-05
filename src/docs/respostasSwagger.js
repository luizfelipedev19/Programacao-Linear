// Respostas de sucesso usadas só na documentação (Swagger).
// Não ficam no schema das rotas para não alterar a serialização real da API.
// Colunas DECIMAL do MySQL são devolvidas como string (ex.: "1.8000") para preservar a precisão.

const decimal = (exemplo, description) => ({ type: 'string', example: exemplo, description });

const mensagem = (texto) => ({
  type: 'object',
  properties: { mensagem: { type: 'string', example: texto } }
});

const criado = (campo, extra = {}) => ({
  type: 'object',
  properties: { [campo]: { type: 'integer', example: 1 }, ...extra }
});

const lista = (item) => ({ type: 'array', items: item });

const alimento = {
  type: 'object',
  properties: {
    id_alimento: { type: 'integer', example: 1 },
    nome: { type: 'string', example: 'Milho' },
    proteina: decimal('8.5100', 'Proteína (%)'),
    energia: decimal('3493.0000', 'Energia (kcal/kg)'),
    fosforo: decimal('0.2700', 'Fósforo (%)'),
    calcio: decimal('0.0200', 'Cálcio (%)'),
    lisina: decimal('0.2300', 'Lisina (%)'),
    custo_kg: decimal('1.8000', 'Custo (R$/kg)')
  }
};

const problema = {
  type: 'object',
  properties: {
    id_problema: { type: 'integer', example: 1 },
    nome: { type: 'string', example: 'Ração suínos 30-60 kg' },
    descricao: { type: ['string', 'null'] },
    objetivo: { type: 'string', enum: ['MIN', 'MAX'] },
    id_problema_origem: { type: ['integer', 'null'], description: 'Problema de origem, quando é um cenário duplicado.' },
    data_criacao: { type: 'string', format: 'date-time' },
    id_usuario: { type: 'integer', description: 'Dono do problema.' }
  }
};

const variavel = {
  type: 'object',
  properties: {
    id_variavel: { type: 'integer', example: 1 },
    id_problema: { type: 'integer', example: 1 },
    id_alimento: { type: ['integer', 'null'] },
    nome: { type: 'string', example: 'Milho' },
    descricao: { type: ['string', 'null'] },
    unidade: { type: ['string', 'null'], example: 'kg' },
    inteira: { type: 'integer', enum: [0, 1], description: '1 = a variável deve assumir valor inteiro.' }
  }
};

const coeficienteObjetivo = {
  type: 'object',
  properties: {
    id_funcao: { type: 'integer', example: 1 },
    id_variavel: { type: 'integer', example: 1 },
    variavel: { type: 'string', example: 'Milho' },
    coeficiente: decimal('1.8000', 'Coeficiente da variável na função objetivo')
  }
};

const restricao = {
  type: 'object',
  properties: {
    id_restricao: { type: 'integer', example: 1 },
    id_problema: { type: 'integer', example: 1 },
    nome: { type: 'string', example: 'Proteína mínima' },
    sinal: { type: 'string', enum: ['<=', '>=', '='] },
    valor: decimal('15.5000', 'Valor limite da restrição'),
    unidade: { type: ['string', 'null'], example: '%' }
  }
};

const coeficienteRestricao = {
  type: 'object',
  properties: {
    id_variavel: { type: 'integer', example: 1 },
    variavel: { type: 'string', example: 'Milho' },
    coeficiente: decimal('8.5100', 'Coeficiente da variável na restrição')
  }
};

const modelo = {
  ...problema,
  properties: {
    ...problema.properties,
    variaveis: {
      type: 'array',
      description: 'Variáveis com alimento associado e coeficiente na função objetivo (números já convertidos).',
      items: { type: 'object', additionalProperties: true }
    },
    restricoes: {
      type: 'array',
      description: 'Restrições com o coeficiente de cada variável (números já convertidos).',
      items: { type: 'object', additionalProperties: true }
    }
  }
};

const ok = (description, schema) => ({ description, ...schema });

export const respostasSucesso = {
  'GET /alimentos': { 200: ok('Lista de alimentos do catálogo.', lista(alimento)) },
  'GET /alimentos/:id': { 200: ok('Alimento encontrado.', alimento) },
  'POST /alimentos': { 201: ok('Alimento criado.', criado('id_alimento')) },
  'PUT /alimentos/:id': { 200: ok('Alimento atualizado.', mensagem('Alimento atualizado com sucesso.')) },
  'DELETE /alimentos/:id': { 200: ok('Alimento excluído.', mensagem('Alimento excluído com sucesso.')) },

  'GET /problemas': { 200: ok('Problemas do usuário autenticado.', lista(problema)) },
  'GET /problemas/:id': { 200: ok('Problema encontrado.', problema) },
  'POST /problemas': { 201: ok('Problema criado.', criado('id_problema')) },
  'PUT /problemas/:id': { 200: ok('Problema atualizado.', mensagem('Problema atualizado com sucesso.')) },
  'DELETE /problemas/:id': { 200: ok('Problema excluído.', mensagem('Problema excluído com sucesso.')) },

  'GET /problemas/:id/variaveis': { 200: ok('Variáveis do problema.', lista(variavel)) },
  'GET /problemas/:id/variaveis/:idVariavel': { 200: ok('Variável encontrada.', variavel) },
  'POST /problemas/:id/variaveis': { 201: ok('Variável criada.', criado('id_variavel')) },
  'PUT /problemas/:id/variaveis/:idVariavel': { 200: ok('Variável atualizada.', mensagem('Variável atualizada com sucesso.')) },
  'DELETE /problemas/:id/variaveis/:idVariavel': { 200: ok('Variável excluída.', mensagem('Variável excluída com sucesso.')) },

  'GET /problemas/:id/objetivo': { 200: ok('Coeficientes da função objetivo.', lista(coeficienteObjetivo)) },
  'PUT /problemas/:id/objetivo/:idVariavel': { 200: ok('Coeficiente salvo.', mensagem('Coeficiente salvo com sucesso.')) },
  'DELETE /problemas/:id/objetivo/:idVariavel': { 200: ok('Coeficiente excluído.', mensagem('Coeficiente excluído com sucesso.')) },

  'GET /problemas/:id/restricoes': { 200: ok('Restrições do problema.', lista(restricao)) },
  'GET /problemas/:id/restricoes/:idRestricao': { 200: ok('Restrição encontrada.', restricao) },
  'POST /problemas/:id/restricoes': {
    201: ok('Restrição criada.', criado('id_restricao', { mensagem: { type: 'string', example: 'Restrição criada com sucesso.' } }))
  },
  'PUT /problemas/:id/restricoes/:idRestricao': { 200: ok('Restrição atualizada.', mensagem('Restrição atualizada com sucesso.')) },
  'DELETE /problemas/:id/restricoes/:idRestricao': { 200: ok('Restrição excluída.', mensagem('Restrição excluída com sucesso.')) },
  'GET /problemas/:id/restricoes/:idRestricao/coeficientes': { 200: ok('Coeficientes da restrição.', lista(coeficienteRestricao)) },
  'PUT /problemas/:id/restricoes/:idRestricao/coeficientes/:idVariavel': { 200: ok('Coeficiente salvo.', mensagem('Coeficiente salvo com sucesso.')) },
  'DELETE /problemas/:id/restricoes/:idRestricao/coeficientes/:idVariavel': { 200: ok('Coeficiente excluído.', mensagem('Coeficiente excluído com sucesso.')) },

  'POST /problemas/:id/duplicar': {
    201: ok('Cenário duplicado.', {
      type: 'object',
      properties: {
        mensagem: { type: 'string', example: 'Problema duplicado com sucesso.' },
        problema: { ...problema, description: 'Novo problema, com id_problema_origem apontando para o original.' }
      }
    })
  },

  'GET /problemas/:id/modelo': { 200: ok('Modelo completo carregado.', modelo) }
};
