
import * as repository from '../repositories/variaveisRepository.js';
import { buscarAlimento } from '../repositories/alimentosRepository.js';

const idValido = (id) =>
  Number.isSafeInteger(Number(id)) && Number(id) > 0;

function validarDados(dados) {
  if (!dados || typeof dados.nome !== 'string' || !dados.nome.trim()) {
    return 'O nome da variável é obrigatório.';
  }

  if (
    dados.id_alimento != null &&
    !idValido(dados.id_alimento)
  ) {
    return 'ID do alimento inválido.';
  }

  if (
    dados.inteira !== undefined &&
    typeof dados.inteira !== 'boolean'
  ) {
    return 'O campo inteira deve ser true ou false.';
  }

  return null;
}

// IDOR: a variável só pode apontar para alimento do próprio usuário.
async function alimentoPermitido({ id_alimento }, idUsuario) {
  if (id_alimento == null) return true;
  return Boolean(await buscarAlimento(id_alimento, idUsuario));
}

function tratarErro(error, request, reply) {
  if (error.code === 'ER_DUP_ENTRY') {
    return reply.code(409).send({
      erro: 'Já existe uma variável com esse nome neste problema.'
    });
  }

  if (
    error.code === 'ER_NO_REFERENCED_ROW_2' ||
    error.code === 'ER_NO_REFERENCED_ROW'
  ) {
    return reply.code(400).send({
      erro: 'O problema ou alimento informado não existe.'
    });
  }

  if (
    error.code === 'ER_ROW_IS_REFERENCED_2' ||
    error.code === 'ER_ROW_IS_REFERENCED'
  ) {
    return reply.code(409).send({
      erro: 'A variável está sendo utilizada na função objetivo ou em restrições.'
    });
  }

  request.log.error(error);
  return reply.code(500).send({
    erro: 'Erro interno do servidor.'
  });
}

// GET /problemas/:id/variaveis
export async function listar(request, reply) {
  try {
    const { id } = request.params;

    if (!idValido(id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    return await repository.listarVariaveis(id);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// GET /problemas/:id/variaveis/:idVariavel
export async function buscar(request, reply) {
  try {
    const { id, idVariavel } = request.params;

    if (!idValido(id) || !idValido(idVariavel)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const variavel = await repository.buscarVariavel(id, idVariavel);

    if (!variavel) {
      return reply.code(404).send({ erro: 'Variável não encontrada.' });
    }

    return variavel;
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// POST /problemas/:id/variaveis
export async function criar(request, reply) {
  try {
    const { id } = request.params;

    if (!idValido(id)) {
      return reply.code(400).send({ erro: 'ID do problema inválido.' });
    }

    const erro = validarDados(request.body);
    if (erro) {
      return reply.code(400).send({ erro });
    }

    if (!await alimentoPermitido(request.body, request.user.id_usuario)) {
      return reply.code(400).send({ erro: 'O alimento informado não existe.' });
    }

    const idVariavel = await repository.criarVariavel(id, {
      ...request.body,
      nome: request.body.nome.trim()
    });

    return reply.code(201).send({
      id_variavel: idVariavel
    });
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// PUT /problemas/:id/variaveis/:idVariavel
export async function atualizar(request, reply) {
  try {
    const { id, idVariavel } = request.params;

    if (!idValido(id) || !idValido(idVariavel)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const erro = validarDados(request.body);
    if (erro) {
      return reply.code(400).send({ erro });
    }

    if (!await alimentoPermitido(request.body, request.user.id_usuario)) {
      return reply.code(400).send({ erro: 'O alimento informado não existe.' });
    }

    const alterados = await repository.atualizarVariavel(
      id,
      idVariavel,
      {
        ...request.body,
        nome: request.body.nome.trim()
      }
    );

    if (!alterados) {
      return reply.code(404).send({ erro: 'Variável não encontrada.' });
    }

    return { mensagem: 'Variável atualizada com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// DELETE /problemas/:id/variaveis/:idVariavel
export async function excluir(request, reply) {
  try {
    const { id, idVariavel } = request.params;

    if (!idValido(id) || !idValido(idVariavel)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const excluidos = await repository.excluirVariavel(id, idVariavel);

    if (!excluidos) {
      return reply.code(404).send({ erro: 'Variável não encontrada.' });
    }

    return { mensagem: 'Variável excluída com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}
