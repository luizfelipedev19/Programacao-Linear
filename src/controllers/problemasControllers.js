
import * as service from '../repositories/problemasRepository.js';

const idValido = (id) =>
  Number.isSafeInteger(Number(id)) && Number(id) > 0;

function tratarErro(error, request, reply) {
  if (
    error.code === 'ER_ROW_IS_REFERENCED_2' ||
    error.code === 'ER_ROW_IS_REFERENCED'
  ) {
    return reply.code(409).send({
      erro: 'Este problema possui dados relacionados e não pode ser excluído.'
    });
  }

  request.log.error(error);

  return reply.code(500).send({
    erro: 'Erro interno do servidor.'
  });
}

// GET /problemas
export async function listar(request, reply) {
  try {
    return await service.listarProblemas();
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// GET /problemas/:id
export async function buscar(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const problema = await service.buscarProblema(request.params.id);

    if (!problema) {
      return reply.code(404).send({ erro: 'Problema não encontrado.' });
    }

    return problema;
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// POST /problemas
export async function criar(request, reply) {
  try {
    const { nome, descricao, objetivo } = request.body ?? {};

    if (
      typeof nome !== 'string' ||
      !nome.trim() ||
      !['MIN', 'MAX'].includes(objetivo)
    ) {
      return reply.code(400).send({
        erro: 'Informe um nome válido e objetivo MIN ou MAX.'
      });
    }

    const id = await service.criarProblema({
      nome: nome.trim(),
      descricao,
      objetivo
    });

    return reply.code(201).send({ id_problema: id });
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// PUT /problemas/:id
export async function atualizar(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const { nome, descricao, objetivo } = request.body ?? {};

    if (
      typeof nome !== 'string' ||
      !nome.trim() ||
      !['MIN', 'MAX'].includes(objetivo)
    ) {
      return reply.code(400).send({
        erro: 'Informe um nome válido e objetivo MIN ou MAX.'
      });
    }

    const alterados = await service.atualizarProblema(
      request.params.id,
      { nome: nome.trim(), descricao, objetivo }
    );

    if (!alterados) {
      return reply.code(404).send({ erro: 'Problema não encontrado.' });
    }

    return { mensagem: 'Problema atualizado com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// DELETE /problemas/:id
export async function excluir(request, reply) {
  try {
    if (!idValido(request.params.id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const excluidos = await service.excluirProblema(request.params.id);

    if (!excluidos) {
      return reply.code(404).send({ erro: 'Problema não encontrado.' });
    }

    return { mensagem: 'Problema excluído com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}
