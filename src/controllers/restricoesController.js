
import * as repository from '../repositories/restricoesRepository.js';

import {
  idValido,
  numeroValido,
  textoValido,
  sinalValido
} from '../utils/validacoes.js';

function tratarErro(error, request, reply) {
  request.log.error(error);

  if (error.code === 'ER_DUP_ENTRY') {
    return reply.code(409).send({
      erro: 'Já existe uma restrição com esse nome no problema.'
    });
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return reply.code(404).send({
      erro: 'Problema não encontrado.'
    });
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return reply.code(409).send({
      erro: 'Esta restrição possui registros vinculados.'
    });
  }

  return reply.code(500).send({
    erro: 'Erro interno do servidor.'
  });
}

function validarDados(dados) {
  return (
    dados !== null &&
    typeof dados === 'object' &&
    !Array.isArray(dados) &&
    textoValido(dados.nome) &&
    sinalValido(dados.sinal) &&
    numeroValido(dados.valor) &&
    (
      dados.unidade == null ||
      typeof dados.unidade === 'string'
    )
  );
}

// GET /problemas/:id/restricoes
export async function listar(request, reply) {
  try {
    const { id } = request.params;

    if (!idValido(id)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    return await repository.listarRestricoes(id);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// GET /problemas/:id/restricoes/:idRestricao
export async function buscar(request, reply) {
  try {
    const { id, idRestricao } = request.params;

    if (!idValido(id) || !idValido(idRestricao)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const restricao = await repository.buscarRestricao(id, idRestricao);

    if (!restricao) {
      return reply.code(404).send({
        erro: 'Restrição não encontrada.'
      });
    }

    return restricao;
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// POST /problemas/:id/restricoes
export async function criar(request, reply) {
  try {
    const { id } = request.params;
    const dados = request.body;

    if (!idValido(id) || !validarDados(dados)) {
      return reply.code(400).send({
        erro: 'Dados da restrição inválidos.'
      });
    }

    const idRestricao = await repository.criarRestricao(id, {
      nome: dados.nome.trim(),
      sinal: dados.sinal,
      valor: Number(dados.valor),
      unidade: dados.unidade ?? null
    });

    return reply.code(201).send({
      mensagem: 'Restrição criada com sucesso.',
      id_restricao: idRestricao
    });
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// PUT /problemas/:id/restricoes/:idRestricao
export async function atualizar(request, reply) {
  try {
    const { id, idRestricao } = request.params;
    const dados = request.body;

    if (
      !idValido(id) ||
      !idValido(idRestricao) ||
      !validarDados(dados)
    ) {
      return reply.code(400).send({
        erro: 'Dados da restrição inválidos.'
      });
    }

    const alterados = await repository.atualizarRestricao(
      id,
      idRestricao,
      {
        nome: dados.nome.trim(),
        sinal: dados.sinal,
        valor: Number(dados.valor),
        unidade: dados.unidade ?? null
      }
    );

    if (!alterados) {
      return reply.code(404).send({
        erro: 'Restrição não encontrada.'
      });
    }

    return {
      mensagem: 'Restrição atualizada com sucesso.'
    };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// DELETE /problemas/:id/restricoes/:idRestricao
export async function excluir(request, reply) {
  try {
    const { id, idRestricao } = request.params;

    if (!idValido(id) || !idValido(idRestricao)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const excluidos = await repository.excluirRestricao(id, idRestricao);

    if (!excluidos) {
      return reply.code(404).send({
        erro: 'Restrição não encontrada.'
      });
    }

    return {
      mensagem: 'Restrição excluída com sucesso.'
    };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// GET /problemas/:id/restricoes/:idRestricao/coeficientes
export async function listarCoeficientes(request, reply) {
  try {
    const { id, idRestricao } = request.params;

    if (!idValido(id) || !idValido(idRestricao)) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const restricao = await repository.buscarRestricao(id, idRestricao);

    if (!restricao) {
      return reply.code(404).send({
        erro: 'Restrição não encontrada.'
      });
    }

    return await repository.listarCoeficientes(idRestricao);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

// PUT /problemas/:id/restricoes/:idRestricao/coeficientes/:idVariavel
export async function salvarCoeficiente(request, reply) {
  try {
    const { id, idRestricao, idVariavel } = request.params;
    const coeficiente = request.body?.coeficiente;

    if (
      !idValido(id) ||
      !idValido(idRestricao) ||
      !idValido(idVariavel) ||
      !numeroValido(coeficiente)
    ) {
      return reply.code(400).send({
        erro: 'IDs ou coeficiente inválidos.'
      });
    }

    const restricao = await repository.buscarRestricao(id, idRestricao);

    if (!restricao) {
      return reply.code(404).send({
        erro: 'Restrição não encontrada.'
      });
    }

    const resultado = await repository.salvarCoeficiente(
      id,
      idRestricao,
      idVariavel,
      Number(coeficiente)
    );

    if (resultado === 0) {
      const coeficientes = await repository.listarCoeficientes(idRestricao);
      const existe = coeficientes.some(
        (item) => Number(item.id_variavel) === Number(idVariavel)
      );

      if (!existe) {
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

// DELETE /problemas/:id/restricoes/:idRestricao/coeficientes/:idVariavel
export async function excluirCoeficiente(request, reply) {
  try {
    const { id, idRestricao, idVariavel } = request.params;

    if (
      !idValido(id) ||
      !idValido(idRestricao) ||
      !idValido(idVariavel)
    ) {
      return reply.code(400).send({ erro: 'ID inválido.' });
    }

    const excluidos = await repository.excluirCoeficiente(
      id,
      idRestricao,
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
