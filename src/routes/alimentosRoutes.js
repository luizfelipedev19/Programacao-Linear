
import * as controller from '../controllers/alimentosControllers.js';

const parametrosId = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
      description: 'ID do alimento'
    }
  }
};

const corpoAlimento = {
  type: 'object',
  required: [
    'nome',
    'proteina',
    'energia',
    'fosforo',
    'calcio',
    'lisina',
    'custo_kg'
  ],
  properties: {
    nome: { type: 'string', minLength: 1 },
    proteina: { type: 'number', minimum: 0 },
    energia: { type: 'number', minimum: 0 },
    fosforo: { type: 'number', minimum: 0 },
    calcio: { type: 'number', minimum: 0 },
    lisina: { type: 'number', minimum: 0 },
    custo_kg: { type: 'number', minimum: 0 }
  }
};

export default async function alimentosRoutes(app) {

  app.addHook('onRequest', app.autenticar);

  // Listar alimentos
  app.get('/alimentos', {
    schema: {
      tags: ['Alimentos'],
      summary: 'Listar todos os alimentos'
    }
  }, controller.listar);

  // Buscar alimento pelo ID
  app.get('/alimentos/:id', {
    schema: {
      tags: ['Alimentos'],
      summary: 'Buscar alimento pelo ID',
      params: parametrosId
    }
  }, controller.buscar);

  // Criar alimento
  app.post('/alimentos', {
    schema: {
      tags: ['Alimentos'],
      summary: 'Cadastrar um novo alimento',
      body: corpoAlimento
    }
  }, controller.criar);

  // Atualizar alimento
  app.put('/alimentos/:id', {
    schema: {
      tags: ['Alimentos'],
      summary: 'Atualizar um alimento',
      params: parametrosId,
      body: corpoAlimento
    }
  }, controller.atualizar);

  // Excluir alimento
  app.delete('/alimentos/:id', {
    schema: {
      tags: ['Alimentos'],
      summary: 'Excluir alimento',
      description: 'A exclusão deve ser bloqueada quando o alimento estiver vinculado a uma variável de decisão.',
      params: parametrosId
    }
  }, controller.excluir);
}
