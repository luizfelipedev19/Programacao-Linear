
import { pool } from '../db.js';

export async function duplicarProblema(idProblema) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    // Buscar problema original
    const [problemas] = await conexao.query(
      `SELECT nome, descricao, objetivo
       FROM problema
       WHERE id_problema = ?`,
      [idProblema]
    );

    if (problemas.length === 0) {
      await conexao.rollback();
      return null;
    }

    const original = problemas[0];

    // Criar cópia do problema
    const [novoProblema] = await conexao.query(
      `INSERT INTO problema
         (nome, descricao, objetivo, id_problema_origem)
       VALUES (?, ?, ?, ?)`,
      [
        `${original.nome} (Cópia)`,
        original.descricao,
        original.objetivo,
        idProblema
      ]
    );

    const novoId = novoProblema.insertId;

    // Copiar variáveis e guardar relação entre IDs
    const [variaveis] = await conexao.query(
      `SELECT * FROM variavel_decisao
       WHERE id_problema = ?`,
      [idProblema]
    );

    const mapaVariaveis = new Map();

    for (const variavel of variaveis) {
      const [resultado] = await conexao.query(
        `INSERT INTO variavel_decisao
           (id_problema, id_alimento, nome, descricao, unidade, inteira)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          novoId,
          variavel.id_alimento,
          variavel.nome,
          variavel.descricao,
          variavel.unidade,
          variavel.inteira
        ]
      );

      mapaVariaveis.set(variavel.id_variavel, resultado.insertId);
    }

    // Copiar função objetivo
    const [coeficientesObjetivo] = await conexao.query(
      `SELECT id_variavel, coeficiente
       FROM funcao_objetivo
       WHERE id_problema = ?`,
      [idProblema]
    );

    for (const item of coeficientesObjetivo) {
      const novaVariavel = mapaVariaveis.get(item.id_variavel);

      await conexao.query(
        `INSERT INTO funcao_objetivo
           (id_problema, id_variavel, coeficiente)
         VALUES (?, ?, ?)`,
        [novoId, novaVariavel, item.coeficiente]
      );
    }

    // Copiar restrições e seus coeficientes
    const [restricoes] = await conexao.query(
      `SELECT * FROM restricao
       WHERE id_problema = ?`,
      [idProblema]
    );

    for (const restricao of restricoes) {
      const [resultado] = await conexao.query(
        `INSERT INTO restricao
           (id_problema, nome, sinal, valor, unidade)
         VALUES (?, ?, ?, ?, ?)`,
        [
          novoId,
          restricao.nome,
          restricao.sinal,
          restricao.valor,
          restricao.unidade
        ]
      );

      const novaRestricao = resultado.insertId;

      const [coeficientes] = await conexao.query(
        `SELECT id_variavel, coeficiente
         FROM restricao_variavel
         WHERE id_restricao = ?`,
        [restricao.id_restricao]
      );

      for (const item of coeficientes) {
        await conexao.query(
          `INSERT INTO restricao_variavel
             (id_restricao, id_variavel, coeficiente)
           VALUES (?, ?, ?)`,
          [
            novaRestricao,
            mapaVariaveis.get(item.id_variavel),
            item.coeficiente
          ]
        );
      }
    }

    await conexao.commit();

    return {
      id_problema: novoId,
      id_problema_origem: Number(idProblema),
      nome: `${original.nome} (Cópia)`
    };
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}
