
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db.js';
import { carregarProblema } from './services/problemaService.js';
import alimentosRoutes from './routes/alimentosRoutes.js';
import problemasRoutes from './routes/problemasRoutes.js';

export async function buildApp() {
  
  const app = Fastify({ logger: true });

  
  await app.register(cors);
  await app.register(alimentosRoutes);
  await app.register(problemasRoutes);

  
  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  
  app.get('/problemas/:id/modelo', async (request, reply) => {
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
