
import { duplicar } from '../controllers/duplicarProblemaController.js';

export default async function duplicarProblemaRoutes(app) {

  app.addHook('onRequest', app.autenticar);
  app.addHook('preHandler', app.autorizarProblema);

  app.post('/problemas/:id/duplicar', {
    schema: {
      tags: ['Duplicação de Cenários'],
      summary: 'Duplicar um problema de programação linear',
      description:
        'Cria uma cópia de um problema existente, incluindo variáveis, função objetivo, restrições e coeficientes. O novo problema registra o ID do problema original.',

      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'integer',
            minimum: 1,
            description: 'ID do problema que será duplicado'
          }
        }
      },

      response: {
        201: {
          description: 'Problema duplicado com sucesso',
          type: 'object',
          additionalProperties: true
        },
        400: {
          description: 'ID inválido',
          type: 'object',
          additionalProperties: true
        },
        404: {
          description: 'Problema não encontrado',
          type: 'object',
          additionalProperties: true
        }
      }
    }
  }, duplicar);
}
