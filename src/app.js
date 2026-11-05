
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { pool } from './db.js';
import { carregarProblema } from './services/problemaService.js';

import alimentosRoutes from './routes/alimentosRoutes.js';
import problemasRoutes from './routes/problemasRoutes.js';
import variaveisRoutes from './routes/variaveisRoutes.js';
import funcaoObjetivoRoutes from './routes/funcaoObjetivoRoutes.js';
import restricoesRoutes from './routes/restricoesRoutes.js';
import duplicarProblemaRoutes from './routes/duplicarProblemaRoutes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors);

  // Configurar Swagger ANTES das rotas
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'API de Programação Linear',
        description: 'API para cadastro e gerenciamento de problemas de programação linear, alimentos, variáveis, função objetivo e restrições.',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3000'
        }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  });

  // Registrar as rotas da API
  await app.register(alimentosRoutes);
  await app.register(problemasRoutes);
  await app.register(variaveisRoutes);
  await app.register(funcaoObjetivoRoutes);
  await app.register(restricoesRoutes);
  await app.register(duplicarProblemaRoutes);

  // Verificar conexão com o banco
  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  // Carregar modelo completo do problema
  
app.get('/problemas/:id/modelo', {
  schema: {
    tags: ['Problemas'],
    summary: 'Carregar modelo completo de programação linear',
    description: 'Retorna os dados do problema, variáveis, alimentos, função objetivo e restrições com os valores numéricos convertidos.',
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'integer',
          minimum: 1,
          description: 'ID do problema'
        }
      }
    },
    response: {
      
200: {
  description: 'Modelo completo carregado com sucesso',
  type: 'object',
  additionalProperties: true,
  properties: {
    id_problema: { type: 'integer' },
    nome: { type: 'string' },
    descricao: { type: ['string', 'null'] },
    objetivo: { type: 'string', enum: ['MIN', 'MAX'] },
    id_problema_origem: { type: ['integer', 'null'] },
    data_criacao: { type: 'string' },
    variaveis: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true
      }
    },
    restricoes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true
      }
    }
  }
}, 
400: {
        type: 'object',
        properties: {
          erro: { type: 'string' }
        }
      },
      404: {
        type: 'object',
        properties: {
          erro: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {

    try {
      const problema = await carregarProblema(request.params.id);

      if (!problema) {
        return reply.code(404).send({
          erro: 'Problema não encontrado.'
        });
      }

      return problema;
    } catch (error) {
      request.log.error(error);

      if (error.message === 'ID do problema inválido.') {
        return reply.code(400).send({
          erro: error.message
        });
      }

      return reply.code(500).send({
        erro: 'Erro ao carregar o modelo do problema.'
      });
    }
  });

  return app;
}
