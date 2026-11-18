import * as repository from '../repositories/exigenciasRepository.js';

const MAX_POR_USUARIO = 100;
const LIMITE_NUTRIENTE = { proteina: 100, energia: 10000, fosforo: 100, calcio: 100, lisina: 100 };

class ErroEntrada extends Error {}

// Regras que o schema não expressa. Devolve os dados normalizados (nome sem espaços, vazios como null).
function validar(corpo) {
  const nome = corpo.nome.trim();
  const minimo = corpo.minimo ?? null;
  const maximo = corpo.maximo ?? null;
  const nutriente = corpo.nutriente ?? null;
  const teores = corpo.teores ?? null;

  if (minimo === null && maximo === null) {
    throw new ErroEntrada('Informe o mínimo, o máximo ou os dois.');
  }
  if (minimo !== null && maximo !== null && minimo > maximo) {
    throw new ErroEntrada('O mínimo não pode ser maior que o máximo.');
  }
  if (minimo !== null && minimo < 0) throw new ErroEntrada('O mínimo não pode ser negativo.');
  if (maximo !== null && maximo < 0) throw new ErroEntrada('O máximo não pode ser negativo.');

  if (nutriente) {
    if (teores) throw new ErroEntrada('Nutriente padrão usa os teores do cadastro de alimentos; não envie "teores".');
    const limite = LIMITE_NUTRIENTE[nutriente];
    if ((minimo !== null && minimo > limite) || (maximo !== null && maximo > limite)) {
      throw new ErroEntrada(`Para este nutriente, use valores de até ${limite}.`);
    }
  }

  return {
    nome,
    unidade: (corpo.unidade ?? '%').trim() || '%',
    nutriente,
    minimo,
    maximo,
    teores: teores && Object.keys(teores).length > 0 ? teores : null
  };
}

function tratarErro(error, request, reply) {
  if (error instanceof ErroEntrada) {
    return reply.code(400).send({ erro: error.message });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return reply.code(409).send({ erro: 'Já existe uma restrição com esse nome.' });
  }
  request.log.error(error);
  return reply.code(500).send({ erro: 'Erro interno do servidor.' });
}

export async function listar(request, reply) {
  try {
    return await repository.listarExigencias(request.user.id_usuario);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function buscar(request, reply) {
  try {
    const exigencia = await repository.buscarExigencia(request.params.id, request.user.id_usuario);
    if (!exigencia) return reply.code(404).send({ erro: 'Restrição não encontrada.' });
    return exigencia;
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function criar(request, reply) {
  try {
    const dados = validar(request.body);
    if (await repository.contarExigencias(request.user.id_usuario) >= MAX_POR_USUARIO) {
      throw new ErroEntrada(`Limite de ${MAX_POR_USUARIO} restrições cadastradas atingido.`);
    }
    const id = await repository.criarExigencia(dados, request.user.id_usuario);
    return reply.code(201).send({ id_exigencia: id });
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function atualizar(request, reply) {
  try {
    const dados = validar(request.body);
    const existe = await repository.buscarExigencia(request.params.id, request.user.id_usuario);
    if (!existe) return reply.code(404).send({ erro: 'Restrição não encontrada.' });
    await repository.atualizarExigencia(request.params.id, dados, request.user.id_usuario);
    return { mensagem: 'Restrição atualizada com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function excluir(request, reply) {
  try {
    const excluidos = await repository.excluirExigencia(request.params.id, request.user.id_usuario);
    if (!excluidos) return reply.code(404).send({ erro: 'Restrição não encontrada.' });
    return { mensagem: 'Restrição excluída com sucesso.' };
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}
