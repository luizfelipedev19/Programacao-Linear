
import { pool } from '../db.js';

// Listar restrições de um problema
export async function listarRestricoes(idProblema) {
  const [rows] = await pool.query(
    `SELECT id_restricao, id_problema, nome,
            sinal, valor, unidade
     FROM restricao
     WHERE id_problema = ?
     ORDER BY id_restricao`,
    [idProblema]
  );

  return rows;
}

// Buscar uma restrição específica
export async function buscarRestricao(idProblema, idRestricao) {
  const [rows] = await pool.query(
    `SELECT id_restricao, id_problema, nome,
            sinal, valor, unidade
     FROM restricao
     WHERE id_problema = ? AND id_restricao = ?`,
    [idProblema, idRestricao]
  );

  return rows[0] ?? null;
}

// Criar uma restrição
export async function criarRestricao(idProblema, dados) {
  const [resultado] = await pool.query(
    `INSERT INTO restricao
       (id_problema, nome, sinal, valor, unidade)
     VALUES (?, ?, ?, ?, ?)`,
    [
      idProblema,
      dados.nome,
      dados.sinal,
      dados.valor,
      dados.unidade ?? null
    ]
  );

  return resultado.insertId;
}

// Atualizar uma restrição
export async function atualizarRestricao(
  idProblema,
  idRestricao,
  dados
) {
  const [resultado] = await pool.query(
    `UPDATE restricao
     SET nome = ?, sinal = ?, valor = ?, unidade = ?
     WHERE id_problema = ? AND id_restricao = ?`,
    [
      dados.nome,
      dados.sinal,
      dados.valor,
      dados.unidade ?? null,
      idProblema,
      idRestricao
    ]
  );

  return resultado.affectedRows;
}

// Excluir uma restrição
export async function excluirRestricao(idProblema, idRestricao) {
  const [resultado] = await pool.query(
    `DELETE FROM restricao
     WHERE id_problema = ? AND id_restricao = ?`,
    [idProblema, idRestricao]
  );

  return resultado.affectedRows;
}

// Listar coeficientes de uma restrição
export async function listarCoeficientes(idRestricao) {
  const [rows] = await pool.query(
    `SELECT rv.id_variavel, v.nome AS variavel,
            rv.coeficiente
     FROM restricao_variavel rv
     JOIN variavel_decisao v
       ON v.id_variavel = rv.id_variavel
     WHERE rv.id_restricao = ?
     ORDER BY rv.id_variavel`,
    [idRestricao]
  );

  return rows;
}

// Criar ou atualizar coeficiente de uma restrição
export async function salvarCoeficiente(
  idProblema,
  idRestricao,
  idVariavel,
  coeficiente
) {
  const [resultado] = await pool.query(
    `INSERT INTO restricao_variavel
       (id_restricao, id_variavel, coeficiente)
     SELECT r.id_restricao, v.id_variavel, ?
     FROM restricao r
     JOIN variavel_decisao v
       ON v.id_problema = r.id_problema
     WHERE r.id_problema = ?
       AND r.id_restricao = ?
       AND v.id_variavel = ?
     ON DUPLICATE KEY UPDATE
       coeficiente = VALUES(coeficiente)`,
    [coeficiente, idProblema, idRestricao, idVariavel]
  );

  return resultado.affectedRows;
}

// Excluir coeficiente de uma restrição
export async function excluirCoeficiente(
  idProblema,
  idRestricao,
  idVariavel
) {
  const [resultado] = await pool.query(
    `DELETE rv FROM restricao_variavel rv
     JOIN restricao r
       ON r.id_restricao = rv.id_restricao
     JOIN variavel_decisao v
       ON v.id_variavel = rv.id_variavel
     WHERE r.id_problema = ?
       AND r.id_restricao = ?
       AND v.id_problema = ?
       AND rv.id_variavel = ?`,
    [idProblema, idRestricao, idProblema, idVariavel]
  );

  return resultado.affectedRows;
}
