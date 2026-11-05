
import * as service from '../services/alimentosServices.js';

const idValido = (id) => Number.isSafeInteger(Number(id)) && Number(id) > 0;

function tratarErro(error, request, reply) {
  if (error.code === 'ER_DUP_ENTRY') {
    return reply.code(409).send({ erro: 'Alimento já cadastrado.' });
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return reply.code(409).send({ erro: 'Alimento está sendo utilizado.' });
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
    return await service.listarAlimentos();
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function buscar(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const alimento = await service.buscarAlimento(request.params.id);

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
    const id = await service.criarAlimento(request.body);
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
      request.body
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

    const excluidos = await service.excluirAlimento(request.params.id);

    if (!excluidos) {
      return reply.code(404).send({ erro: 'Alimento não encontrado.' });
    }

    return { mensagem: 'Alimento excluído com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}
