
import { duplicarProblema } from '../repositories/duplicarProblemaRepository.js';
import { idValido } from '../utils/validacoes.js';

// POST /problemas/:id/duplicar
export async function duplicar(request, reply) {
  try {
    const { id } = request.params;

    // Validar o ID do problema
    if (!idValido(id)) {
      return reply.code(400).send({
        erro: 'ID do problema inválido.'
      });
    }

    // Duplicar o problema no banco de dados
    const novoProblema = await duplicarProblema(
      Number(id),
      request.user.id_usuario
    );

    // Verificar se o problema original existe
    if (!novoProblema) {
      return reply.code(404).send({
        erro: 'Problema original não encontrado.'
      });
    }

    return reply.code(201).send({
      mensagem: 'Problema duplicado com sucesso.',
      problema: novoProblema
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      erro: 'Erro interno ao duplicar o problema.'
    });
  }
}
