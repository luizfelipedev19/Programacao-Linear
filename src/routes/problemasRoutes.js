
import { NOME_MAX, DESCRICAO_MAX, NAO_VAZIO } from '../utils/limites.js';
import * as controller from '../controllers/problemasControllers.js';

const parametrosId = {
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

const corpoProblema = {
  type: 'object',
  required: ['nome', 'objetivo'],
  properties: {
    nome: {
      type: 'string',
      minLength: 1,
      maxLength: NOME_MAX,
      pattern: NAO_VAZIO,
      description: 'Nome do problema'
    },
    descricao: {
      type: 'string',
      maxLength: DESCRICAO_MAX,
      description: 'Descrição do problema'
    },
    objetivo: {
      type: 'string',
      enum: ['MIN', 'MAX'],
      description: 'MIN para minimizar ou MAX para maximizar'
    }
  }
};

export default async function problemasRoutes(app) {

  app.addHook('onRequest', app.autenticar);
  app.addHook('preHandler', app.autorizarProblema);

  // Listar problemas
  app.get('/problemas', {
    schema: {
      tags: ['Problemas'],
      summary: 'Listar todos os problemas'
    }
  }, controller.listar);

  // Buscar problema pelo ID
  app.get('/problemas/:id', {
    schema: {
      tags: ['Problemas'],
      summary: 'Buscar problema pelo ID',
      params: parametrosId
    }
  }, controller.buscar);

  // Criar problema
  app.post('/problemas', {
    schema: {
      tags: ['Problemas'],
      summary: 'Cadastrar um novo problema',
      description: 'Cria um problema de programação linear com objetivo MIN ou MAX.',
      body: corpoProblema
    }
  }, controller.criar);

  // Atualizar problema
  app.put('/problemas/:id', {
    schema: {
      tags: ['Problemas'],
      summary: 'Atualizar um problema',
      params: parametrosId,
      body: corpoProblema
    }
  }, controller.atualizar);

  // Excluir problema
  app.delete('/problemas/:id', {
    schema: {
      tags: ['Problemas'],
      summary: 'Excluir um problema',
      params: parametrosId
    }
  }, controller.excluir);
}
