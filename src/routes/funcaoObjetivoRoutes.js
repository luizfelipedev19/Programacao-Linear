
import { DECIMAL_MAX } from '../utils/limites.js';
import * as controller from '../controllers/funcaoObjetivoController.js';

const parametrosProblema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
      description: 'ID do problema'
    }
  }
};

const parametrosCoeficiente = {
  type: 'object',
  required: ['id', 'idVariavel'],
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
      description: 'ID do problema'
    },
    idVariavel: {
      type: 'integer',
      minimum: 1,
      description: 'ID da variável de decisão'
    }
  }
};

const corpoCoeficiente = {
  type: 'object',
  required: ['coeficiente'],
  properties: {
    coeficiente: {
      type: 'number',
      minimum: -DECIMAL_MAX,
      maximum: DECIMAL_MAX,
      description: 'Coeficiente da variável na função objetivo',
      examples: [1.5]
    }
  }
};

export default async function funcaoObjetivoRoutes(app) {

  app.addHook('onRequest', app.autenticar);
  app.addHook('preHandler', app.autorizarProblema);

  // Listar coeficientes
  app.get('/problemas/:id/objetivo', {
    schema: {
      tags: ['Função Objetivo'],
      summary: 'Listar coeficientes da função objetivo',
      description: 'Retorna os coeficientes das variáveis da função objetivo de um problema.',
      params: parametrosProblema
    }
  }, controller.listar);

  // Criar ou atualizar coeficiente
  app.put('/problemas/:id/objetivo/:idVariavel', {
    schema: {
      tags: ['Função Objetivo'],
      summary: 'Cadastrar ou atualizar coeficiente',
      description: 'Define o coeficiente de uma variável na função objetivo.',
      params: parametrosCoeficiente,
      body: corpoCoeficiente
    }
  }, controller.salvar);

  // Excluir coeficiente
  app.delete('/problemas/:id/objetivo/:idVariavel', {
    schema: {
      tags: ['Função Objetivo'],
      summary: 'Excluir coeficiente da função objetivo',
      params: parametrosCoeficiente
    }
  }, controller.excluir);
}
