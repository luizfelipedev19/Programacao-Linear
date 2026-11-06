import { exemploRacao } from '../docs/exemploRacao.js';
import { corpoAlimento } from './alimentosRoutes.js';
import {
  DECIMAL_MAX, DESCRICAO_MAX, NAO_VAZIO, NOME_MAX, UNIDADE_MAX
} from '../utils/limites.js';
import * as controller from '../controllers/problemaCompletoController.js';

const numero = { type: 'number', minimum: -DECIMAL_MAX, maximum: DECIMAL_MAX };
const nome = { type: 'string', minLength: 1, maxLength: NOME_MAX, pattern: NAO_VAZIO };

const corpoCompleto = {
  type: 'object',
  additionalProperties: false,
  required: ['nome', 'objetivo', 'variaveis', 'restricoes'],
  properties: {
    nome: { ...nome, description: 'Nome do problema' },
    descricao: { type: 'string', maxLength: DESCRICAO_MAX },
    objetivo: { type: 'string', enum: ['MIN', 'MAX'], description: 'MIN minimiza e MAX maximiza' },
    alimentos: {
      type: 'array',
      maxItems: 200,
      description: 'Opcional. Alimentos a cadastrar. Se você já tem um com o mesmo nome, ele é reaproveitado sem alteração.',
      items: corpoAlimento
    },
    variaveis: {
      type: 'array',
      minItems: 1,
      maxItems: 200,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome'],
        properties: {
          nome: { ...nome, description: 'Nome único no problema; é a chave usada nos coeficientes das restrições' },
          descricao: { type: 'string', maxLength: DESCRICAO_MAX },
          unidade: { type: 'string', maxLength: UNIDADE_MAX },
          inteira: { type: 'boolean', description: 'Padrão: false' },
          alimento: { type: 'string', description: 'Nome de um alimento seu (pode ser um de "alimentos")' },
          id_alimento: { type: 'integer', minimum: 1, description: 'Alternativa a "alimento": ID de um alimento seu' },
          coeficiente_objetivo: { ...numero, description: 'Coeficiente da variável na função objetivo (na ração, o custo por kg)' }
        }
      }
    },
    restricoes: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'sinal', 'valor', 'coeficientes'],
        properties: {
          nome: { ...nome, description: 'Nome único no problema' },
          sinal: { type: 'string', enum: ['<=', '>=', '='] },
          valor: { ...numero, description: 'Lado direito da restrição' },
          unidade: { type: 'string', maxLength: UNIDADE_MAX },
          coeficientes: {
            type: 'object',
            minProperties: 1,
            additionalProperties: numero,
            description: 'Coeficiente de cada variável na restrição, pelo nome da variável. Variável ausente vale 0.'
          }
        }
      }
    }
  },
  examples: [exemploRacao]
};

export default async function problemaCompletoRoutes(app) {
  app.addHook('onRequest', app.autenticar);

  app.post('/problemas/completo', {
    schema: {
      tags: ['Problemas'],
      summary: 'Cadastrar um problema completo de uma vez',
      description:
        'Cria, em uma única chamada e uma única transação, o problema, as variáveis, a função objetivo, ' +
        'as restrições e seus coeficientes (e, opcionalmente, os alimentos). Se qualquer parte for inválida, ' +
        'nada é gravado. O corpo de exemplo é o problema da ração. Depois, execute em POST /problemas/{id}/executar.',
      body: corpoCompleto
    }
  }, controller.criar);
}
