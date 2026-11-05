
import * as repository from '../repositories/funcaoObjetivoRepository.js';

import {
  idValido,
  numeroValido
} from '../utils/validacoes.js';

function tratarErro(error, request, reply) {
  request.log.error(error);

  return reply.code(500).send({
    erro: 'Erro interno do servidor.'
  });
}

// GET /problemas/:id/objetivo
export async function listar(request, reply) {
  try {
    const { id } = request.params;

    if (!idValido(id)) {
      return reply.code(400).send({
        erro: 'ID do problema inválido.'
      });
    }

    return await repository.listarCoeficientes(id);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// PUT /problemas/:id/objetivo/:idVariavel
// Cadastra ou atualiza um coeficiente
export async function salvar(request, reply) {
  try {
    const { id, idVariavel } = request.params;

    if (!idValido(id) || !idValido(idVariavel)) {
      return reply.code(400).send({
        erro: 'ID inválido.'
      });
    }

    const coeficiente = request.body?.coeficiente;

    if (!numeroValido(coeficiente)) {
      return reply.code(400).send({
        erro: 'Informe um coeficiente numérico válido.'
      });
    }

    const resultado = await repository.salvarCoeficiente(
      id,
      idVariavel,
      Number(coeficiente)
    );

    if (resultado === 0) {
      // Pode significar que a variável não existe
      // ou que o coeficiente já tinha o mesmo valor.
      const variavelExiste = await repository.listarCoeficientes(id);

      if (!variavelExiste.some(
        (item) => Number(item.id_variavel) === Number(idVariavel)
      )) {
        return reply.code(404).send({
          erro: 'Variável não encontrada neste problema.'
        });
      }
    }

    return {
      mensagem: 'Coeficiente salvo com sucesso.'
    };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// DELETE /problemas/:id/objetivo/:idVariavel
export async function excluir(request, reply) {
  try {
    const { id, idVariavel } = request.params;

    if (!idValido(id) || !idValido(idVariavel)) {
      return reply.code(400).send({
        erro: 'ID inválido.'
      });
    }

    const excluidos = await repository.excluirCoeficiente(
      id,
      idVariavel
    );

    if (!excluidos) {
      return reply.code(404).send({
        erro: 'Coeficiente não encontrado.'
      });
    }

    return {
      mensagem: 'Coeficiente excluído com sucesso.'
    };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}
