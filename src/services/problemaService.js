
import { pool } from '../db.js';

const numero = (valor) =>
  valor === null || valor === undefined ? null : Number(valor);

export async function carregarProblema(id) {
  const idProblema = Number(id);

  if (!Number.isInteger(idProblema) || idProblema <= 0) {
    throw new Error('ID do problema inválido.');
  }

  const [problemas] = await pool.query(
    `SELECT id_problema, nome, descricao, objetivo,
            id_problema_origem, data_criacao
     FROM problema
     WHERE id_problema = ?`,
    [idProblema]
  );

  if (problemas.length === 0) {
    return null;
  }

  const problema = problemas[0];

  const [variaveis] = await pool.query(
    `SELECT
       v.id_variavel,
       v.id_alimento,
       v.nome,
       v.descricao,
       v.unidade,
       v.inteira,
       a.nome AS alimento_nome,
       a.proteina,
       a.energia,
       a.fosforo,
       a.calcio,
       a.lisina,
       a.custo_kg
     FROM variavel_decisao v
     LEFT JOIN alimento a
       ON a.id_alimento = v.id_alimento
     WHERE v.id_problema = ?
     ORDER BY v.id_variavel`,
    [idProblema]
  );

  const [funcaoObjetivo] = await pool.query(
    `SELECT id_variavel, coeficiente
     FROM funcao_objetivo
     WHERE id_problema = ?`,
    [idProblema]
  );

  const [restricoes] = await pool.query(
    `SELECT id_restricao, nome, sinal, valor, unidade
     FROM restricao
     WHERE id_problema = ?
     ORDER BY id_restricao`,
    [idProblema]
  );

  const [coeficientes] = await pool.query(
    `SELECT
       rv.id_restricao,
       rv.id_variavel,
       v.nome AS nome_variavel,
       rv.coeficiente
     FROM restricao_variavel rv
     INNER JOIN restricao r
       ON r.id_restricao = rv.id_restricao
     INNER JOIN variavel_decisao v
       ON v.id_variavel = rv.id_variavel
     WHERE r.id_problema = ?
     ORDER BY rv.id_restricao, rv.id_variavel`,
    [idProblema]
  );

  const objetivoPorVariavel = {};

  for (const item of funcaoObjetivo) {
    objetivoPorVariavel[item.id_variavel] =
      numero(item.coeficiente);
  }

  const coeficientesPorRestricao = {};

  for (const item of coeficientes) {
    if (!coeficientesPorRestricao[item.id_restricao]) {
      coeficientesPorRestricao[item.id_restricao] = {};
    }

    coeficientesPorRestricao[item.id_restricao][
      item.nome_variavel
    ] = numero(item.coeficiente);
  }

  return {
    id_problema: problema.id_problema,
    nome: problema.nome,
    descricao: problema.descricao,
    objetivo: problema.objetivo,
    id_problema_origem: problema.id_problema_origem,
    data_criacao: problema.data_criacao,

    variaveis: variaveis.map((v) => ({
      id_variavel: v.id_variavel,
      id_alimento: v.id_alimento,
      nome: v.nome,
      descricao: v.descricao,
      unidade: v.unidade,
      inteira: Boolean(v.inteira),

      coeficiente_objetivo:
        objetivoPorVariavel[v.id_variavel] ?? 0,

      alimento: v.id_alimento === null ? null : {
        id_alimento: v.id_alimento,
        nome: v.alimento_nome,
        proteina: numero(v.proteina),
        energia: numero(v.energia),
        fosforo: numero(v.fosforo),
        calcio: numero(v.calcio),
        lisina: numero(v.lisina),
        custo_kg: numero(v.custo_kg)
      }
    })),

    restricoes: restricoes.map((r) => ({
      id_restricao: r.id_restricao,
      nome: r.nome,
      sinal: r.sinal,
      valor: numero(r.valor),
      unidade: r.unidade,

      coeficientes:
        coeficientesPorRestricao[r.id_restricao] ?? {}
    }))
  };
}
