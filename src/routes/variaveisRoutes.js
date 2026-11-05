
import * as controller from '../controllers/variaveisController.js';

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

const parametrosVariavel = {
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

const corpoVariavel = {
  type: 'object',
  required: ['nome'],
  properties: {
    nome: {
      type: 'string',
      minLength: 1,
      description: 'Nome da variável, como x1 ou x2'
    },
    descricao: {
      type: ['string', 'null'],
      description: 'Descrição da variável'
    },
    unidade: {
      type: ['string', 'null'],
      description: 'Unidade de medida, como kg'
    },
    inteira: {
      type: 'boolean',
      description: 'Indica se a variável deve assumir valores inteiros'
    },
    id_alimento: {
      type: ['integer', 'null'],
      minimum: 1,
      description: 'ID do alimento associado à variável'
    }
  }
};

export default async function variaveisRoutes(app) {

  // Listar variáveis de um problema
  app.get('/problemas/:id/variaveis', {
    schema: {
      tags: ['Variáveis de Decisão'],
      summary: 'Listar variáveis de um problema',
      params: parametrosProblema
    }
  }, controller.listar);

  // Buscar variável pelo ID
  app.get('/problemas/:id/variaveis/:idVariavel', {
    schema: {
      tags: ['Variáveis de Decisão'],
      summary: 'Buscar variável pelo ID',
      params: parametrosVariavel
    }
  }, controller.buscar);

  // Criar variável
  app.post('/problemas/:id/variaveis', {
    schema: {
      tags: ['Variáveis de Decisão'],
      summary: 'Cadastrar variável de decisão',
      description: 'Cria uma variável vinculada a um problema de programação linear.',
      params: parametrosProblema,
      body: corpoVariavel
    }
  }, controller.criar);

  // Atualizar variável
  app.put('/problemas/:id/variaveis/:idVariavel', {
    schema: {
      tags: ['Variáveis de Decisão'],
      summary: 'Atualizar variável de decisão',
      params: parametrosVariavel,
      body: corpoVariavel
    }
  }, controller.atualizar);

  // Excluir variável
  app.delete('/problemas/:id/variaveis/:idVariavel', {
    schema: {
      tags: ['Variáveis de Decisão'],
      summary: 'Excluir variável de decisão',
      params: parametrosVariavel
    }
  }, controller.excluir);
}
