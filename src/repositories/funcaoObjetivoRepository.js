
import { pool } from '../db.js';

// Listar os coeficientes da função objetivo
export async function listarCoeficientes(idProblema) {
  const [rows] = await pool.query(
    `SELECT fo.id_funcao, fo.id_variavel,
            v.nome AS variavel, fo.coeficiente
     FROM funcao_objetivo fo
     JOIN variavel_decisao v
       ON v.id_variavel = fo.id_variavel
     WHERE fo.id_problema = ?
     ORDER BY fo.id_variavel`,
    [idProblema]
  );

  return rows;
}

// Criar ou atualizar o coeficiente de uma variável
export async function salvarCoeficiente(
  idProblema,
  idVariavel,
  coeficiente
) {
  const [resultado] = await pool.query(
    `INSERT INTO funcao_objetivo
       (id_problema, id_variavel, coeficiente)
     SELECT v.id_problema, v.id_variavel, ?
     FROM variavel_decisao v
     WHERE v.id_problema = ? AND v.id_variavel = ?
     ON DUPLICATE KEY UPDATE
       coeficiente = VALUES(coeficiente)`,
    [coeficiente, idProblema, idVariavel]
  );

  return resultado.affectedRows;
}

// Excluir o coeficiente de uma variável
export async function excluirCoeficiente(idProblema, idVariavel) {
  const [resultado] = await pool.query(
    `DELETE FROM funcao_objetivo
     WHERE id_problema = ? AND id_variavel = ?`,
    [idProblema, idVariavel]
  );

  return resultado.affectedRows;
}
