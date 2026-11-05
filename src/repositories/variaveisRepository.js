
import { pool } from '../db.js';

export async function listarVariaveis(idProblema) {
  const [rows] = await pool.query(
    `SELECT * FROM variavel_decisao
     WHERE id_problema = ?
     ORDER BY id_variavel`,
    [idProblema]
  );
  return rows;
}

export async function buscarVariavel(idProblema, idVariavel) {
  const [rows] = await pool.query(
    `SELECT * FROM variavel_decisao
     WHERE id_problema = ? AND id_variavel = ?`,
    [idProblema, idVariavel]
  );
  return rows[0] ?? null;
}

export async function criarVariavel(idProblema, dados) {
  const { id_alimento, nome, descricao, unidade, inteira } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO variavel_decisao
     (id_problema, id_alimento, nome, descricao, unidade, inteira)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      idProblema,
      id_alimento ?? null,
      nome,
      descricao ?? null,
      unidade ?? null,
      inteira ? 1 : 0
    ]
  );

  return resultado.insertId;
}

export async function atualizarVariavel(idProblema, idVariavel, dados) {
  const { id_alimento, nome, descricao, unidade, inteira } = dados;

  const [resultado] = await pool.query(
    `UPDATE variavel_decisao
     SET id_alimento = ?, nome = ?, descricao = ?,
         unidade = ?, inteira = ?
     WHERE id_problema = ? AND id_variavel = ?`,
    [
      id_alimento ?? null,
      nome,
      descricao ?? null,
      unidade ?? null,
      inteira ? 1 : 0,
      idProblema,
      idVariavel
    ]
  );

  return resultado.affectedRows;
}

export async function excluirVariavel(idProblema, idVariavel) {
  const [resultado] = await pool.query(
    `DELETE FROM variavel_decisao
     WHERE id_problema = ? AND id_variavel = ?`,
    [idProblema, idVariavel]
  );

  return resultado.affectedRows;
}
