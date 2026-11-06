import { inteiro, obrigatoria } from './utils/ambiente.js';

const producao = process.env.NODE_ENV === 'production';
const jwtSecret = obrigatoria('JWT_SECRET');

// Segredo curto ou de exemplo permite forjar tokens.
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
}
if (producao && /^troque/i.test(jwtSecret)) {
  throw new Error('JWT_SECRET ainda é o valor de exemplo; defina uma chave própria.');
}

export const config = {
  producao,
  jwtSecret,
  // Origens autorizadas a chamar a API pelo navegador (separadas por vírgula). Padrão: Vite.
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean),
  // Só ligue atrás de proxy reverso confiável; senão o IP do rate limit pode ser forjado.
  trustProxy: process.env.TRUST_PROXY === 'true',
  // Swagger fica desligado em produção, a menos que SWAGGER_ENABLED=true.
  swaggerAtivo: process.env.SWAGGER_ENABLED
    ? process.env.SWAGGER_ENABLED === 'true'
    : !producao,
  limites: {
    global: inteiro('RATE_LIMIT_GLOBAL', 300),
    login: inteiro('RATE_LIMIT_LOGIN', 10),
    cadastro: inteiro('RATE_LIMIT_CADASTRO', 10),
    executar: inteiro('RATE_LIMIT_EXECUTAR', 30)
  }
};
