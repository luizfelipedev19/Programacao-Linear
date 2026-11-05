import solver from 'javascript-lp-solver';

import { carregarProblema } from './problemaService.js';
import { salvarResultado } from '../repositories/resultadosRepository.js';

const TOLERANCIA = 0.000001;

export class ErroModelo extends Error {}

function numeroFinito(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function chaveVariavel(idVariavel) {
  return `v_${idVariavel}`;
}

function chaveRestricao(idRestricao) {
  return `r_${idRestricao}`;
}

function validarProblema(problema) {
  if (problema.variaveis.length === 0) {
    throw new ErroModelo('O problema precisa ter ao menos uma variável de decisão.');
  }

  if (problema.restricoes.length === 0) {
    throw new ErroModelo('O problema precisa ter ao menos uma restrição.');
  }

  if (problema.variaveis.every((variavel) => variavel.coeficiente_objetivo === 0)) {
    throw new ErroModelo('Defina a função objetivo com ao menos um coeficiente diferente de zero.');
  }

  for (const variavel of problema.variaveis) {
    if (!numeroFinito(variavel.coeficiente_objetivo)) {
      throw new ErroModelo('Há coeficiente inválido na função objetivo.');
    }
  }

  for (const restricao of problema.restricoes) {
    if (!numeroFinito(restricao.valor)) {
      throw new ErroModelo('Há valor inválido em uma restrição.');
    }

    for (const coeficiente of Object.values(restricao.coeficientes)) {
      if (!numeroFinito(coeficiente)) {
        throw new ErroModelo('Há coeficiente inválido em uma restrição.');
      }
    }
  }
}

export function montarModelo(problema) {
  validarProblema(problema);

  const modelo = {
    optimize: 'objetivo',
    opType: problema.objetivo === 'MIN' ? 'min' : 'max',
    constraints: {},
    variables: {},
    ints: {}
  };

  for (const restricao of problema.restricoes) {
    const chave = chaveRestricao(restricao.id_restricao);
    modelo.constraints[chave] = {
      [restricao.sinal === '<=' ? 'max' : restricao.sinal === '>=' ? 'min' : 'equal']:
        restricao.valor
    };
  }

  for (const variavel of problema.variaveis) {
    const chave = chaveVariavel(variavel.id_variavel);
    modelo.variables[chave] = {
      objetivo: variavel.coeficiente_objetivo
    };

    if (variavel.inteira) modelo.ints[chave] = 1;

    for (const restricao of problema.restricoes) {
      modelo.variables[chave][chaveRestricao(restricao.id_restricao)] =
        restricao.coeficientes[variavel.nome] ?? 0;
    }
  }

  if (Object.keys(modelo.ints).length === 0) delete modelo.ints;
  return modelo;
}

function verificarRestricoes(problema, valores) {
  return problema.restricoes.map((restricao) => {
    const valorCalculado = problema.variaveis.reduce(
      (total, variavel) => total +
        (restricao.coeficientes[variavel.nome] ?? 0) * valores[variavel.id_variavel],
      0
    );

    let folga;
    let atendida;

    if (restricao.sinal === '<=') {
      folga = restricao.valor - valorCalculado;
      atendida = folga >= -TOLERANCIA;
    } else if (restricao.sinal === '>=') {
      folga = valorCalculado - restricao.valor;
      atendida = folga >= -TOLERANCIA;
    } else {
      folga = Math.abs(valorCalculado - restricao.valor);
      atendida = folga <= TOLERANCIA;
    }

    return {
      id_restricao: restricao.id_restricao,
      valor_calculado: valorCalculado,
      folga,
      atendida
    };
  });
}

function statusDaSolucao(solucao) {
  if (solucao.bounded === false) return 'ILIMITADO';
  if (solucao.feasible !== true) return 'INVIAVEL';
  return 'OTIMO';
}

export async function executarProblema(idProblema, idUsuario) {
  const problema = await carregarProblema(idProblema, idUsuario);
  if (!problema) return null;

  const modelo = montarModelo(problema);
  let solucao;

  try {
    solucao = solver.Solve(modelo);
  } catch (error) {
    await salvarResultado({ idProblema: problema.id_problema, status: 'ERRO' });
    throw error;
  }

  const status = statusDaSolucao(solucao);
  if (status !== 'OTIMO') {
    return salvarResultado({ idProblema: problema.id_problema, status });
  }

  const valores = Object.fromEntries(
    problema.variaveis.map((variavel) => [
      variavel.id_variavel,
      Number(solucao[chaveVariavel(variavel.id_variavel)] ?? 0)
    ])
  );

  return salvarResultado({
    idProblema: problema.id_problema,
    status,
    valorObjetivo: Number(solucao.result),
    variaveis: problema.variaveis.map((variavel) => ({
      id_variavel: variavel.id_variavel,
      valor: valores[variavel.id_variavel]
    })),
    restricoes: verificarRestricoes(problema, valores)
  });
}
