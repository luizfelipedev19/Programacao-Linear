import { buscarProblema } from '../repositories/problemasRepository.js';
import { listarResultados } from '../repositories/resultadosRepository.js';
import { ErroModelo, executarProblema } from '../services/solverService.js';
import { idValido } from '../utils/validacoes.js';

function tratarErro(error, request, reply) {
  if (error instanceof ErroModelo) {
    return reply.code(400).send({ erro: error.message });
  }

  request.log.error(error);
  return reply.code(500).send({ erro: 'Erro ao executar o solver.' });
}

export async function executar(request, reply) {
  try {
    const { id } = request.params;
    if (!idValido(id)) return reply.code(400).send({ erro: 'ID inválido.' });

    const resultado = await executarProblema(Number(id), request.user.id_usuario);
    if (!resultado) return reply.code(404).send({ erro: 'Problema não encontrado.' });

    return reply.code(201).send(resultado);
  } catch (error) {
    return tratarErro(error, request, reply);
  }
}

export async function listar(request, reply) {
  try {
    const { id } = request.params;
    if (!idValido(id)) return reply.code(400).send({ erro: 'ID inválido.' });

    const problema = await buscarProblema(Number(id), request.user.id_usuario);
    if (!problema) return reply.code(404).send({ erro: 'Problema não encontrado.' });

    return await listarResultados(Number(id));
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro ao consultar os resultados.' });
  }
}
