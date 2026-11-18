import { pool } from '../db.js';

const numero = (valor) =>
  valor === null || valor === undefined ? null : Number(valor);

function montarResultado(resultado, variaveis, restricoes) {
  return {
    id_resultado: resultado.id_resultado,
    id_problema: resultado.id_problema,
    valor_objetivo: numero(resultado.valor_objetivo),
    status: resultado.status,
    data_calculo: resultado.data_calculo,
    variaveis,
    restricoes
  };
}

async function carregarDetalhes(connection, idResultado) {
  const [resultados] = await connection.query(
    `SELECT id_resultado, id_problema, valor_objetivo, status, data_calculo
     FROM resultado
     WHERE id_resultado = ?`,
    [idResultado]
  );

  if (resultados.length === 0) return null;

  const [variaveis] = await connection.query(
    `SELECT rv.id_variavel, v.nome, rv.valor, fo.coeficiente AS custo_unitario
     FROM resultado_variavel rv
     INNER JOIN variavel_decisao v ON v.id_variavel = rv.id_variavel
     LEFT JOIN funcao_objetivo fo ON fo.id_variavel = rv.id_variavel
     WHERE rv.id_resultado = ?
     ORDER BY rv.id_variavel`,
    [idResultado]
  );

  const [restricoes] = await connection.query(
    `SELECT rr.id_restricao, r.nome, r.sinal, r.valor AS valor_restricao,
            rr.valor_calculado, rr.folga, rr.atendida
     FROM resultado_restricao rr
     INNER JOIN restricao r ON r.id_restricao = rr.id_restricao
     WHERE rr.id_resultado = ?
     ORDER BY rr.id_restricao`,
    [idResultado]
  );

  return montarResultado(
    resultados[0],
    variaveis.map((item) => ({
      id_variavel: item.id_variavel,
      nome: item.nome,
      valor: numero(item.valor),
      custo_unitario: numero(item.custo_unitario)
    })),
    restricoes.map((item) => ({
      id_restricao: item.id_restricao,
      nome: item.nome,
      sinal: item.sinal,
      valor_restricao: numero(item.valor_restricao),
      valor_calculado: numero(item.valor_calculado),
      folga: numero(item.folga),
      atendida: Boolean(item.atendida)
    }))
  );
}

export async function salvarResultado({
  idProblema,
  status,
  valorObjetivo = null,
  variaveis = [],
  restricoes = []
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [inserido] = await connection.query(
      `INSERT INTO resultado (id_problema, valor_objetivo, status)
       VALUES (?, ?, ?)`,
      [idProblema, valorObjetivo, status]
    );

    const idResultado = inserido.insertId;

    if (variaveis.length > 0) {
      await connection.query(
        `INSERT INTO resultado_variavel (id_resultado, id_variavel, valor)
         VALUES ?`,
        [variaveis.map((item) => [
          idResultado,
          item.id_variavel,
          item.valor
        ])]
      );
    }

    if (restricoes.length > 0) {
      await connection.query(
        `INSERT INTO resultado_restricao
           (id_resultado, id_restricao, valor_calculado, folga, atendida)
         VALUES ?`,
        [restricoes.map((item) => [
          idResultado,
          item.id_restricao,
          item.valor_calculado,
          item.folga,
          item.atendida
        ])]
      );
    }

    await connection.commit();
    return await carregarDetalhes(connection, idResultado);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listarResultados(idProblema) {
  const connection = await pool.getConnection();

  try {
    const [resultados] = await connection.query(
      `SELECT id_resultado
       FROM resultado
       WHERE id_problema = ?
       ORDER BY data_calculo DESC, id_resultado DESC
       LIMIT 100`,
      [idProblema]
    );

    return await Promise.all(
      resultados.map((item) => carregarDetalhes(connection, item.id_resultado))
    );
  } finally {
    connection.release();
  }
}
