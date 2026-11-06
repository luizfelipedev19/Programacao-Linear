
import * as service from '../services/alimentosServices.js';
import { AlimentoEmUsoError } from '../services/alimentosServices.js';

const idValido = (id) => Number.isSafeInteger(Number(id)) && Number(id) > 0;

function tratarErro(error, request, reply) {
  if (error.code === 'ER_DUP_ENTRY') {
    return reply.code(409).send({ erro: 'Alimento já cadastrado.' });
  }

  if (error instanceof AlimentoEmUsoError || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return reply.code(409).send({ erro: 'Alimento está sendo utilizado em uma variável de decisão.' });
  }

  if (error.message?.startsWith('Nome do alimento') ||
      error.message?.startsWith('Valor inválido')) {
    return reply.code(400).send({ erro: error.message });
  }

  request.log.error(error);
  return reply.code(500).send({ erro: 'Erro interno do servidor.' });
}

export async function listar(request, reply) {
  try {
    return await service.listarAlimentos(request.user.id_usuario);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function buscar(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const alimento = await service.buscarAlimento(
      request.params.id,
      request.user.id_usuario
    );

    if (!alimento) {
      return reply.code(404).send({ erro: 'Alimento não encontrado.' });
    }

    return alimento;
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function criar(request, reply) {
  try {
    const id = await service.criarAlimento(request.body, request.user.id_usuario);
    return reply.code(201).send({ id_alimento: id });
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function atualizar(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const alterados = await service.atualizarAlimento(
      request.params.id,
      request.body,
      request.user.id_usuario
    );

    if (!alterados) {
      return reply.code(404).send({ erro: 'Alimento não encontrado.' });
    }

    return { mensagem: 'Alimento atualizado com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function excluir(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const excluidos = await service.excluirAlimento(
      request.params.id,
      request.user.id_usuario
    );

    if (!excluidos) {
      return reply.code(404).send({ erro: 'Alimento não encontrado.' });
    }

    return { mensagem: 'Alimento excluído com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}
