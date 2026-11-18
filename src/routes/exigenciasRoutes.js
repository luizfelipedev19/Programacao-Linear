import { NAO_VAZIO, NOME_MAX, UNIDADE_MAX, DECIMAL_MAX } from '../utils/limites.js';
import * as controller from '../controllers/exigenciasController.js';

const parametrosId = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'integer', minimum: 1, description: 'ID da restrição' }
  }
};

const corpoExigencia = {
  type: 'object',
  additionalProperties: false,
  required: ['nome'],
  properties: {
    nome: { type: 'string', minLength: 1, maxLength: NOME_MAX, pattern: NAO_VAZIO, description: 'Nome da restrição, único por usuário', examples: ['Proteína'] },
    unidade: { type: 'string', maxLength: UNIDADE_MAX, description: 'Unidade (padrão: %)', examples: ['%'] },
    nutriente: {
      type: ['string', 'null'],
      enum: ['proteina', 'energia', 'fosforo', 'calcio', 'lisina', null],
      description: 'Nutriente padrão (usa os teores do cadastro de alimentos) ou nulo para um nutriente próprio'
    },
    minimo: { type: ['number', 'null'], minimum: 0, maximum: DECIMAL_MAX, description: 'Valor mínimo exigido' },
    maximo: { type: ['number', 'null'], minimum: 0, maximum: DECIMAL_MAX, description: 'Valor máximo permitido' },
    teores: {
      type: ['object', 'null'],
      maxProperties: 200,
      additionalProperties: { type: 'number', minimum: 0, maximum: 99999 },
      description: 'Só para nutriente próprio: teor de cada ingrediente, pelo nome do ingrediente'
    }
  }
};

export default async function exigenciasRoutes(app) {
  app.addHook('onRequest', app.autenticar);

  app.get('/exigencias', {
    schema: { tags: ['Restrições cadastradas'], summary: 'Listar as restrições nutricionais cadastradas' }
  }, controller.listar);

  app.get('/exigencias/:id', {
    schema: { tags: ['Restrições cadastradas'], summary: 'Buscar uma restrição cadastrada', params: parametrosId }
  }, controller.buscar);

  app.post('/exigencias', {
    schema: {
      tags: ['Restrições cadastradas'],
      summary: 'Cadastrar uma restrição nutricional',
      description: 'Guarda uma exigência (mínimo e/ou máximo de um nutriente) para reutilizar em novas formulações.',
      body: corpoExigencia
    }
  }, controller.criar);

  app.put('/exigencias/:id', {
    schema: { tags: ['Restrições cadastradas'], summary: 'Atualizar uma restrição cadastrada', params: parametrosId, body: corpoExigencia }
  }, controller.atualizar);

  app.delete('/exigencias/:id', {
    schema: { tags: ['Restrições cadastradas'], summary: 'Excluir uma restrição cadastrada', params: parametrosId }
  }, controller.excluir);
}
