import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

import { buscarProblema } from '../repositories/problemasRepository.js';

export default fp(async function autenticacao(app) {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'troque-esta-chave-em-producao'
  });

  app.decorate('autenticar', async function autenticar(request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ erro: 'Token ausente, inválido ou expirado.' });
    }
  });

  app.decorate('autorizarProblema', async function autorizarProblema(request, reply) {
    const idProblema = request.params?.id;
    if (idProblema === undefined) return;

    const problema = await buscarProblema(idProblema, request.user.id_usuario);
    if (!problema) {
      return reply.code(404).send({ erro: 'Problema não encontrado.' });
    }
  });
});
