import { pool } from '../db.js';

export class ErroEntrada extends Error {}

async function resolverAlimentos(connection, alimentos, idUsuario) {
  // nome -> id_alimento. Alimento que o usuário já tem com o mesmo nome é reaproveitado, sem alteração.
  const ids = new Map();

  for (const a of alimentos) {
    const [existentes] = await connection.query(
      'SELECT id_alimento FROM alimento WHERE id_usuario = ? AND nome = ?',
      [idUsuario, a.nome]
    );

    if (existentes.length > 0) {
      ids.set(a.nome, existentes[0].id_alimento);
      continue;
    }

    const [resultado] = await connection.query(
      `INSERT INTO alimento
       (nome, proteina, energia, fosforo, calcio, lisina, custo_kg, id_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.nome, a.proteina, a.energia, a.fosforo, a.calcio, a.lisina, a.custo_kg, idUsuario]
    );
    ids.set(a.nome, resultado.insertId);
  }

  return ids;
}

async function idDoAlimento(connection, variavel, idsPorNome, idUsuario) {
  if (variavel.id_alimento != null) {
    const [rows] = await connection.query(
      'SELECT id_alimento FROM alimento WHERE id_alimento = ? AND id_usuario = ?',
      [variavel.id_alimento, idUsuario]
    );
    if (rows.length === 0) {
      throw new ErroEntrada(`O alimento ${variavel.id_alimento} da variável '${variavel.nome}' não existe.`);
    }
    return rows[0].id_alimento;
  }

  if (variavel.alimento != null) {
    if (idsPorNome.has(variavel.alimento)) return idsPorNome.get(variavel.alimento);

    const [rows] = await connection.query(
      'SELECT id_alimento FROM alimento WHERE id_usuario = ? AND nome = ?',
      [idUsuario, variavel.alimento]
    );
    if (rows.length === 0) {
      throw new ErroEntrada(`O alimento '${variavel.alimento}' da variável '${variavel.nome}' não existe.`);
    }
    return rows[0].id_alimento;
  }

  return null;
}

// Cria problema, variáveis, função objetivo, restrições e coeficientes em uma única transação.
export async function criarProblemaCompleto(dados, idUsuario) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const idsAlimentos = await resolverAlimentos(connection, dados.alimentos ?? [], idUsuario);

    const [problema] = await connection.query(
      'INSERT INTO problema (nome, descricao, objetivo, id_usuario) VALUES (?, ?, ?, ?)',
      [dados.nome, dados.descricao ?? null, dados.objetivo, idUsuario]
    );
    const idProblema = problema.insertId;

    const idsVariaveis = new Map();
    for (const v of dados.variaveis) {
      const idAlimento = await idDoAlimento(connection, v, idsAlimentos, idUsuario);

      const [resultado] = await connection.query(
        `INSERT INTO variavel_decisao
         (id_problema, id_alimento, nome, descricao, unidade, inteira)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idProblema, idAlimento, v.nome, v.descricao ?? null, v.unidade ?? null, v.inteira ? 1 : 0]
      );
      idsVariaveis.set(v.nome, resultado.insertId);

      if (v.coeficiente_objetivo != null) {
        await connection.query(
          'INSERT INTO funcao_objetivo (id_problema, id_variavel, coeficiente) VALUES (?, ?, ?)',
          [idProblema, resultado.insertId, v.coeficiente_objetivo]
        );
      }
    }

    let totalCoeficientes = 0;
    for (const r of dados.restricoes) {
      const [restricao] = await connection.query(
        'INSERT INTO restricao (id_problema, nome, sinal, valor, unidade) VALUES (?, ?, ?, ?, ?)',
        [idProblema, r.nome, r.sinal, r.valor, r.unidade ?? null]
      );

      for (const [nomeVariavel, coeficiente] of Object.entries(r.coeficientes)) {
        await connection.query(
          'INSERT INTO restricao_variavel (id_restricao, id_variavel, coeficiente) VALUES (?, ?, ?)',
          [restricao.insertId, idsVariaveis.get(nomeVariavel), coeficiente]
        );
        totalCoeficientes += 1;
      }
    }

    await connection.commit();

    return {
      id_problema: idProblema,
      alimentos: idsAlimentos.size,
      variaveis: idsVariaveis.size,
      restricoes: dados.restricoes.length,
      coeficientes_restricoes: totalCoeficientes
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
