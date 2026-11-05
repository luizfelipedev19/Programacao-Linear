import * as controller from '../controllers/authController.js';

const usuario = {
  type: 'object',
  properties: {
    id_usuario: { type: 'integer' },
    nome: { type: 'string' },
    email: { type: 'string', format: 'email' },
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
    schema: {
      tags: ['Autenticação'],
      summary: 'Cadastrar usuário',
      body: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 8, format: 'password' }
        }
      },
      response: { 201: respostaAutenticacao, 400: erro, 409: erro, 500: erro }
    }
  }, controller.cadastrar);

  app.post('/auth/login', {
    schema: {
      tags: ['Autenticação'],
      summary: 'Autenticar usuário e emitir JWT',
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string', minLength: 8, format: 'password' }
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
}
