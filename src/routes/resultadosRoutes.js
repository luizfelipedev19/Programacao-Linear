import * as controller from '../controllers/resultadosController.js';

const parametrosProblema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1, description: 'ID do problema' }
  }
};

const respostaResultado = {
  type: 'object',
  properties: {
    id_resultado: { type: 'integer' },
    id_problema: { type: 'integer' },
    valor_objetivo: { type: ['number', 'null'] },
    status: {
      type: 'string',
      enum: ['PENDENTE', 'OTIMO', 'INVIAVEL', 'ILIMITADO', 'ERRO']
    },
    data_calculo: { type: 'string' },
    variaveis: { type: 'array', items: { type: 'object' } },
    restricoes: { type: 'array', items: { type: 'object' } }
  }
};

const respostaErro = {
  type: 'object',
  properties: { erro: { type: 'string' } }
};

export default async function resultadosRoutes(app) {
  app.addHook('onRequest', app.autenticar);
  app.addHook('preHandler', app.autorizarProblema);
  app.post('/problemas/:id/executar', {
    schema: {
      tags: ['Solver e Resultados'],
      summary: 'Executar a otimização de um problema',
      description: 'Monta o modelo no javascript-lp-solver, executa, valida as restrições e persiste o resultado.',
      params: parametrosProblema,
      response: { 201: respostaResultado, 400: respostaErro, 404: respostaErro, 500: respostaErro }
    }
  }, controller.executar);

  app.get('/problemas/:id/resultados', {
    schema: {
      tags: ['Solver e Resultados'],
      summary: 'Listar o histórico de resultados de um problema',
      params: parametrosProblema,
      response: {
        200: { type: 'array', items: respostaResultado },
        400: respostaErro,
        404: respostaErro,
        500: respostaErro
      }
    }
  }, controller.listar);
}
