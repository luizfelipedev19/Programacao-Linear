
import * as repository from '../repositories/alimentosRepository.js';

export const listarAlimentos = repository.listarAlimentos;
export const buscarAlimento = repository.buscarAlimento;

export class AlimentoEmUsoError extends Error {}

// A FK é ON DELETE SET NULL, então o MySQL não bloqueia sozinho (RF04).
export async function excluirAlimento(id) {
  if (await repository.alimentoEmUso(id)) {
    throw new AlimentoEmUsoError('Alimento está sendo utilizado em uma variável de decisão.');
  }

  return repository.excluirAlimento(id);
}

function validarAlimento(dados) {
  const campos = [
    'proteina', 'energia', 'fosforo',
    'calcio', 'lisina', 'custo_kg'
  ];

  if (!dados || typeof dados.nome !== 'string' || !dados.nome.trim()) {
    throw new Error('Nome do alimento é obrigatório.');
  }

  for (const campo of campos) {
    if (
      dados[campo] === undefined ||
      dados[campo] === null ||
      dados[campo] === '' ||
      !Number.isFinite(Number(dados[campo])) ||
      Number(dados[campo]) < 0
    ) {
      throw new Error(`Valor inválido para ${campo}.`);
    }
  }
}

export async function criarAlimento(dados) {
  validarAlimento(dados);
  return repository.criarAlimento({ ...dados, nome: dados.nome.trim() });
}

export async function atualizarAlimento(id, dados) {
  validarAlimento(dados);
  return repository.atualizarAlimento(id, { ...dados, nome: dados.nome.trim() });
}
