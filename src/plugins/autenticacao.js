import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

import { config } from '../config.js';
import { buscarProblema } from '../repositories/problemasRepository.js';

export default fp(async function autenticacao(app) {
  await app.register(jwt, {
    secret: config.jwtSecret,
    // Fixar o algoritmo impede ataques de troca de algoritmo (alg=none etc.).
    sign: { algorithm: 'HS256' },
    verify: { algorithms: ['HS256'] }
  });

  app.decorate('autenticar', async function autenticar(request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      const erro = request.headers.authorization
        ? "Token inválido ou expirado. No Swagger, clique em Authorize e cole apenas o token, sem 'Bearer' e sem aspas."
        : 'Token ausente. Envie o cabeçalho Authorization: Bearer <token>.';
      return reply.code(401).send({ erro });
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
