
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { pool } from './db.js';
import { respostasSucesso } from './docs/respostasSwagger.js';
import { carregarProblema } from './services/problemaService.js';
import autenticacao from './plugins/autenticacao.js';

import authRoutes from './routes/authRoutes.js';
import alimentosRoutes from './routes/alimentosRoutes.js';
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
    : instancePath.split('/').filter(Boolean).join('.') || 'corpo da requisição';
  const nome = `${error.validationContext === 'params' ? 'parâmetro' : 'campo'} '${campo}'`;

  switch (keyword) {
    case 'required': return `O ${nome} é obrigatório.`;
    case 'type': return `O ${nome} deve ser do tipo ${[params.type].flat().map((t) => ({ string: 'texto', number: 'número', integer: 'número inteiro', boolean: 'verdadeiro/falso', object: 'objeto', array: 'lista' }[t] ?? t)).join(' ou ')}.`;
    case 'minimum': return `O ${nome} deve ser maior ou igual a ${params.limit}.`;
    case 'maximum': return `O ${nome} deve ser menor ou igual a ${params.limit}.`;
    case 'minLength': return `O ${nome} deve ter no mínimo ${params.limit} caractere(s).`;
    case 'maxLength': return `O ${nome} deve ter no máximo ${params.limit} caracteres.`;
    case 'pattern': return `O ${nome} não pode ficar em branco.`;
    case 'enum': return `O ${nome} deve ser um destes valores: ${params.allowedValues.join(', ')}.`;
    case 'format': return params.format === 'email' ? `O ${nome} deve ser um e-mail válido.` : `O ${nome} está em formato inválido.`;
    default: return `O ${nome} é inválido.`;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });

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

    return reply.code(status).send({ erro: mensagemValidacao(error) });
  });

  await app.register(cors);
  await app.register(autenticacao);

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
      ],
      tags: [
        { name: 'Sistema', description: 'Verificação de funcionamento da API e da conexão com o banco.' },
        { name: 'Autenticação', description: 'Cadastro e login de usuários. O login retorna o JWT usado em todas as demais rotas (botão Authorize).' },
        { name: 'Alimentos', description: 'Catálogo compartilhado de alimentos, com nutrientes e custo por kg.' },
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

  // Registrar as rotas da API
  await app.register(authRoutes);
  await app.register(alimentosRoutes);
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
