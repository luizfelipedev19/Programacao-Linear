import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors);

  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  return app;
}
