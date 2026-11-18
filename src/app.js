
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config.js';
import { pool } from './db.js';
import { respostasSucesso } from './docs/respostasSwagger.js';
import { carregarProblema } from './services/problemaService.js';
import autenticacao from './plugins/autenticacao.js';

import authRoutes from './routes/authRoutes.js';
import alimentosRoutes from './routes/alimentosRoutes.js';
import exigenciasRoutes from './routes/exigenciasRoutes.js';
import problemaCompletoRoutes from './routes/problemaCompletoRoutes.js';
import problemasRoutes from './routes/problemasRoutes.js';
import variaveisRoutes from './routes/variaveisRoutes.js';
import funcaoObjetivoRoutes from './routes/funcaoObjetivoRoutes.js';
import restricoesRoutes from './routes/restricoesRoutes.js';
import duplicarProblemaRoutes from './routes/duplicarProblemaRoutes.js';
import resultadosRoutes from './routes/resultadosRoutes.js';

const ROTAS_PUBLICAS = ['/auth/cadastro', '/auth/login', '/health'];

const respostaErro = (description) => ({
  description,
  type: 'object',
  properties: { erro: { type: 'string' } }
});

// Só afeta a documentação: o schema real da rota (validação/serialização) não é alterado.
function documentarRota({ schema, url, route }) {
  const publica = ROTAS_PUBLICAS.includes(url);
  const metodo = [route?.method].flat()[0];
  const chave = `${metodo} ${url.replace(/\{(\w+)\}/g, ':$1')}`;
  const respostas = { ...respostasSucesso[chave], ...schema.response };
  const adicionar = (codigo, descricao) => {
    respostas[codigo] ??= respostaErro(descricao);
  };

  if (schema.params || schema.body) adicionar(400, 'Dados de entrada inválidos.');
  if (!publica) adicionar(401, 'Token ausente, inválido ou expirado.');
  if (schema.params) adicionar(404, 'Recurso não encontrado.');
  if (schema.body && !publica) adicionar(409, 'Conflito com um registro já existente.');
  if (url === '/auth/cadastro') adicionar(409, 'E-mail já cadastrado.');
  adicionar(429, 'Limite de requisições excedido. Aguarde e tente novamente.');
  adicionar(500, 'Erro interno do servidor.');

  return {
    schema: { ...schema, response: respostas, security: publica ? [] : [{ bearerAuth: [] }] },
    url
  };
}

function mensagemValidacao(error) {
  const [detalhe] = error.validation ?? [];
  if (!detalhe) return error.message;

  const { keyword, params, instancePath } = detalhe;
  const campo = keyword === 'required'
    ? params.missingProperty
    : instancePath.split('/').filter(Boolean).map((parte) => (/^\d+$/.test(parte) ? `[${parte}]` : `.${parte}`)).join('').replace(/^\./, '') || 'corpo da requisição';
  const nome = `${error.validationContext === 'params' ? 'parâmetro' : 'campo'} '${campo}'`;

  switch (keyword) {
    case 'required': return `O ${nome} é obrigatório.`;
    case 'type': return `O ${nome} deve ser do tipo ${[params.type].flat().map((t) => ({ string: 'texto', number: 'número', integer: 'número inteiro', boolean: 'verdadeiro/falso', object: 'objeto', array: 'lista' }[t] ?? t)).join(' ou ')}.`;
    case 'minimum': return `O ${nome} deve ser maior ou igual a ${params.limit}.`;
    case 'maximum': return `O ${nome} deve ser menor ou igual a ${params.limit}.`;
    case 'minLength': return `O ${nome} deve ter no mínimo ${params.limit} caractere(s).`;
    case 'minItems': return `O ${nome} deve ter pelo menos ${params.limit} item(ns).`;
    case 'maxItems': return `O ${nome} pode ter no máximo ${params.limit} itens.`;
    case 'minProperties': return `O ${nome} deve ter pelo menos ${params.limit} item(ns).`;
    case 'maxLength': return `O ${nome} deve ter no máximo ${params.limit} caracteres.`;
    case 'pattern': return `O ${nome} não pode ficar em branco.`;
    case 'enum': return `O ${nome} deve ser um destes valores: ${params.allowedValues.join(', ')}.`;
    case 'format': return params.format === 'email' ? `O ${nome} deve ser um e-mail válido.` : `O ${nome} está em formato inválido.`;
    default: return `O ${nome} é inválido.`;
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: { redact: ['req.headers.authorization', 'req.headers.cookie'] },
    trustProxy: config.trustProxy,
    // Limites contra requisições abusivas (DoS): corpo pequeno, timeouts e parâmetros curtos.
    bodyLimit: 100 * 1024,
    connectionTimeout: 30_000,
    requestTimeout: 30_000,
    keepAliveTimeout: 5_000,
    routerOptions: { maxParamLength: 50 }
  });

  // Content-Type JSON sem corpo (ex.: POST /executar via Axios/fetch) faria o Fastify responder 400.
  app.addHook('onRequest', async (request) => {
    const { 'content-length': tamanho, 'transfer-encoding': encoding } = request.headers;
    if (tamanho === '0' || (tamanho === undefined && encoding === undefined)) {
      delete request.headers['content-type'];
    }
  });

  // Erros do próprio Fastify (validação, JSON inválido) no mesmo formato { erro } do resto da API.
  // Sem isso, rotas com schema de resposta 400 serializam esses erros como `{}`.
  app.setErrorHandler((error, request, reply) => {
    const status = error.statusCode ?? 500;

    if (status >= 500) {
      request.log.error(error);
      return reply.code(status).send({ erro: 'Erro interno do servidor.' });
    }

    if (status === 413) {
      return reply.code(413).send({ erro: 'Corpo da requisição grande demais.' });
    }

    if (status === 415) {
      return reply.code(415).send({ erro: 'Tipo de conteúdo não suportado. Use application/json.' });
    }

    return reply.code(status).send({ erro: mensagemValidacao(error) });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({ erro: 'Rota não encontrada.' })
  );

  await app.register(helmet, {
    // API JSON: a CSP não se aplica (o Swagger UI traz a sua própria).
    contentSecurityPolicy: false
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
  });

  await app.register(rateLimit, {
    global: true,
    max: config.limites.global,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, contexto) =>
      Object.assign(
        new Error(`Muitas requisições. Tente novamente em ${Math.ceil(contexto.ttl / 1000)} segundos.`),
        { statusCode: 429 }
      )
  });
  await app.register(autenticacao);

  // Configurar Swagger ANTES das rotas (desligado em produção, ver config.swaggerAtivo)
  if (config.swaggerAtivo) {
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
        ],
        tags: [
          { name: 'Sistema', description: 'Verificação de funcionamento da API e da conexão com o banco.' },
          { name: 'Autenticação', description: 'Cadastro e login de usuários. O login retorna o JWT usado em todas as demais rotas (botão Authorize).' },
          { name: 'Restrições cadastradas', description: 'Restrições nutricionais (mínimo e máximo de cada nutriente) que o usuário cadastra uma vez e reutiliza nas formulações.' },
          { name: 'Alimentos', description: 'Alimentos do usuário autenticado, com nutrientes e custo por kg. Cada usuário só vê e altera os seus.' },
          { name: 'Problemas', description: 'Cadastro dos problemas (cenários) de otimização, com objetivo MIN ou MAX. Cada problema pertence ao usuário autenticado.' },
          { name: 'Variáveis de Decisão', description: 'Variáveis de um problema; podem estar ligadas a um alimento e ser inteiras.' },
          { name: 'Função Objetivo', description: 'Coeficiente de cada variável na função objetivo do problema.' },
          { name: 'Restrições', description: 'Restrições do problema (<=, >=, =), valor limite e coeficiente de cada variável em cada restrição.' },
          { name: 'Duplicação de Cenários', description: 'Cria um novo cenário a partir de um problema existente, para testar variações dos valores.' },
          { name: 'Solver e Resultados', description: 'Consulta do modelo completo, execução do jsLPSolver e histórico de resultados.' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      },
      transform: documentarRota
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        persistAuthorization: true
      }
    });
  }

  // Registrar as rotas da API
  await app.register(authRoutes);
  await app.register(alimentosRoutes);
  await app.register(exigenciasRoutes);
  await app.register(problemaCompletoRoutes);
  await app.register(problemasRoutes);
  await app.register(variaveisRoutes);
  await app.register(funcaoObjetivoRoutes);
  await app.register(restricoesRoutes);
  await app.register(duplicarProblemaRoutes);
  await app.register(resultadosRoutes);

  // Verificar conexão com o banco
  app.get('/health', {
    schema: {
      tags: ['Sistema'],
      summary: 'Verificar conexão com o banco',
      description: 'Executa uma consulta simples no MySQL e retorna `ok` se a API e o banco estão disponíveis.',
      response: {
        200: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } }
      }
    }
  }, async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });

  // Carregar modelo completo do problema
  
app.get('/problemas/:id/modelo', {
  onRequest: [app.autenticar],
  preHandler: [app.autorizarProblema],
  schema: {
    tags: ['Solver e Resultados'],
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
      const problema = await carregarProblema(
        request.params.id,
        request.user.id_usuario
      );

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
