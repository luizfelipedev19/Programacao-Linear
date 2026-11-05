
import * as controller from '../controllers/restricoesController.js';

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

const parametrosRestricao = {
  type: 'object',
  required: ['id', 'idRestricao'],
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
      description: 'ID do problema'
    },
    idRestricao: {
      type: 'integer',
      minimum: 1,
      description: 'ID da restrição'
    }
  }
};

const parametrosCoeficiente = {
  type: 'object',
  required: ['id', 'idRestricao', 'idVariavel'],
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
      description: 'ID do problema'
    },
    idRestricao: {
      type: 'integer',
      minimum: 1,
      description: 'ID da restrição'
    },
    idVariavel: {
      type: 'integer',
      minimum: 1,
      description: 'ID da variável de decisão'
    }
  }
};

const corpoRestricao = {
  type: 'object',
  required: ['nome', 'sinal', 'valor'],
  properties: {
    nome: {
      type: 'string',
      minLength: 1,
      description: 'Nome da restrição'
    },
    sinal: {
      type: 'string',
      enum: ['<=', '>=', '='],
      description: 'Operador da restrição'
    },
    valor: {
      type: 'number',
      description: 'Valor do lado direito da restrição'
    },
    unidade: {
      type: ['string', 'null'],
      description: 'Unidade de medida'
    }
  }
};

const corpoCoeficiente = {
  type: 'object',
  required: ['coeficiente'],
  properties: {
    coeficiente: {
      type: 'number',
      description: 'Coeficiente da variável na restrição',
      examples: [8.5]
    }
  }
};

export default async function restricoesRoutes(app) {

  // Listar restrições
  app.get('/problemas/:id/restricoes', {
    schema: {
      tags: ['Restrições'],
      summary: 'Listar restrições de um problema',
      params: parametrosProblema
    }
  }, controller.listar);

  // Buscar restrição pelo ID
  app.get('/problemas/:id/restricoes/:idRestricao', {
    schema: {
      tags: ['Restrições'],
      summary: 'Buscar restrição pelo ID',
      params: parametrosRestricao
    }
  }, controller.buscar);

  // Criar restrição
  app.post('/problemas/:id/restricoes', {
    schema: {
      tags: ['Restrições'],
      summary: 'Cadastrar uma restrição',
      description: 'Cria uma restrição vinculada a um problema.',
      params: parametrosProblema,
      body: corpoRestricao
    }
  }, controller.criar);

  // Atualizar restrição
  app.put('/problemas/:id/restricoes/:idRestricao', {
    schema: {
      tags: ['Restrições'],
      summary: 'Atualizar uma restrição',
      params: parametrosRestricao,
      body: corpoRestricao
    }
  }, controller.atualizar);

  // Excluir restrição
  app.delete('/problemas/:id/restricoes/:idRestricao', {
    schema: {
      tags: ['Restrições'],
      summary: 'Excluir uma restrição',
      params: parametrosRestricao
    }
  }, controller.excluir);

  // Listar coeficientes
  app.get(
    '/problemas/:id/restricoes/:idRestricao/coeficientes',
    {
      schema: {
        tags: ['Restrições'],
        summary: 'Listar coeficientes de uma restrição',
        params: parametrosRestricao
      }
    },
    controller.listarCoeficientes
  );

  // Criar ou atualizar coeficiente
  app.put(
    '/problemas/:id/restricoes/:idRestricao/coeficientes/:idVariavel',
    {
      schema: {
        tags: ['Restrições'],
        summary: 'Cadastrar ou atualizar coeficiente',
        description: 'Define o coeficiente de uma variável em uma restrição.',
        params: parametrosCoeficiente,
        body: corpoCoeficiente
      }
    },
    controller.salvarCoeficiente
  );

  // Excluir coeficiente
  app.delete(
    '/problemas/:id/restricoes/:idRestricao/coeficientes/:idVariavel',
    {
      schema: {
        tags: ['Restrições'],
        summary: 'Excluir coeficiente de uma restrição',
        params: parametrosCoeficiente
      }
    },
    controller.excluirCoeficiente
  );
}
