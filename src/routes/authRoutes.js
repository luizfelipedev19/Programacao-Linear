import { NOME_MAX, EMAIL_MAX, SENHA_MAX, NAO_VAZIO } from '../utils/limites.js';
import { config } from '../config.js';
import * as controller from '../controllers/authController.js';

const usuario = {
  type: 'object',
  properties: {
    id_usuario: { type: 'integer' },
    nome: { type: 'string' },
    email: { type: 'string', format: 'email', maxLength: EMAIL_MAX },
    data_criacao: { type: 'string' }
  }
};

const respostaAutenticacao = {
  type: 'object',
  properties: {
    usuario,
    token: { type: 'string' }
  }
};

const erro = { type: 'object', properties: { erro: { type: 'string' } } };

export default async function authRoutes(app) {
  app.post('/auth/cadastro', {
    // Limite próprio: cadastro em massa e enumeração de e-mails.
    config: { rateLimit: { max: config.limites.cadastro, timeWindow: '1 hour' } },
    schema: {
      tags: ['Autenticação'],
      summary: 'Cadastrar usuário',
      body: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        additionalProperties: false,
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: NOME_MAX, pattern: NAO_VAZIO },
          email: { type: 'string', format: 'email', maxLength: EMAIL_MAX },
          senha: { type: 'string', minLength: 8, maxLength: SENHA_MAX, format: 'password' }
        }
      },
      response: { 201: respostaAutenticacao, 400: erro, 409: erro, 500: erro }
    }
  }, controller.cadastrar);

  app.post('/auth/login', {
    // Limite próprio: freia tentativa de senha por força bruta.
    config: { rateLimit: { max: config.limites.login, timeWindow: '1 minute' } },
    schema: {
      tags: ['Autenticação'],
      summary: 'Autenticar usuário e emitir JWT',
      body: {
        type: 'object',
        required: ['email', 'senha'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: EMAIL_MAX },
          senha: { type: 'string', minLength: 8, maxLength: SENHA_MAX, format: 'password' }
        }
      },
      response: { 200: respostaAutenticacao, 400: erro, 401: erro, 500: erro }
    }
  }, controller.login);

  app.get('/auth/perfil', {
    onRequest: [app.autenticar],
    schema: {
      tags: ['Autenticação'],
      summary: 'Consultar o usuário autenticado',
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'object', properties: { usuario } }, 401: erro }
    }
  }, controller.perfil);

  app.put('/auth/perfil', {
    onRequest: [app.autenticar],
    schema: {
      tags: ['Autenticação'],
      summary: 'Alterar nome e e-mail do usuário autenticado',
      description: 'Devolve um novo token, porque nome e e-mail fazem parte dele.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['nome', 'email'],
        additionalProperties: false,
        properties: {
          nome: { type: 'string', minLength: 2, maxLength: NOME_MAX, pattern: NAO_VAZIO },
          email: { type: 'string', format: 'email', maxLength: EMAIL_MAX }
        }
      },
      response: { 200: respostaAutenticacao, 400: erro, 401: erro, 404: erro, 409: erro, 500: erro }
    }
  }, controller.atualizarPerfil);

  app.put('/auth/senha', {
    onRequest: [app.autenticar],
    // Exige a senha atual; o limite freia quem tenta adivinhá-la com um token roubado.
    config: { rateLimit: { max: config.limites.login, timeWindow: '1 minute' } },
    schema: {
      tags: ['Autenticação'],
      summary: 'Alterar a senha do usuário autenticado',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['senhaAtual', 'novaSenha'],
        additionalProperties: false,
        properties: {
          senhaAtual: { type: 'string', minLength: 1, maxLength: SENHA_MAX, format: 'password' },
          novaSenha: { type: 'string', minLength: 8, maxLength: SENHA_MAX, format: 'password' }
        }
      },
      response: { 204: { type: 'null' }, 400: erro, 401: erro, 403: erro, 500: erro }
    }
  }, controller.alterarSenha);

  app.delete('/auth/conta', {
    onRequest: [app.autenticar],
    config: { rateLimit: { max: config.limites.login, timeWindow: '1 minute' } },
    schema: {
      tags: ['Autenticação'],
      summary: 'Excluir a conta e todos os dados do usuário autenticado',
      description: 'Apaga problemas, resultados, ingredientes e exigências. Não tem volta.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['senha'],
        additionalProperties: false,
        properties: {
          senha: { type: 'string', minLength: 1, maxLength: SENHA_MAX, format: 'password' }
        }
      },
      response: { 204: { type: 'null' }, 400: erro, 401: erro, 403: erro, 500: erro }
    }
  }, controller.excluirConta);
}
