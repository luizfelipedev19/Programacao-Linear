import { pool } from '../db.js';

const COLUNAS = `id_alimento, nome, proteina, energia, fosforo,
                 calcio, lisina, custo_kg`;

// Toda consulta é filtrada por id_usuario: o alimento só é visível ao seu dono.

export async function listarAlimentos(idUsuario) {
  const [rows] = await pool.query(
    `SELECT ${COLUNAS} FROM alimento
     WHERE id_usuario = ? ORDER BY id_alimento`,
    [idUsuario]
  );
  return rows;
}

export async function buscarAlimento(id, idUsuario) {
  const [rows] = await pool.query(
    `SELECT ${COLUNAS} FROM alimento
     WHERE id_alimento = ? AND id_usuario = ?`,
    [id, idUsuario]
  );

  return rows[0] ?? null;
}

export async function criarAlimento(dados, idUsuario) {
  const { nome, proteina, energia, fosforo, calcio, lisina, custo_kg } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO alimento
     (nome, proteina, energia, fosforo, calcio, lisina, custo_kg, id_usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome, proteina, energia, fosforo, calcio, lisina, custo_kg, idUsuario]
  );

  return resultado.insertId;
}

export async function atualizarAlimento(id, dados, idUsuario) {
  const { nome, proteina, energia, fosforo, calcio, lisina, custo_kg } = dados;

  const [resultado] = await pool.query(
    `UPDATE alimento
     SET nome = ?, proteina = ?, energia = ?, fosforo = ?,
         calcio = ?, lisina = ?, custo_kg = ?
     WHERE id_alimento = ? AND id_usuario = ?`,
    [nome, proteina, energia, fosforo, calcio, lisina, custo_kg, id, idUsuario]
  );

  return resultado.affectedRows;
}

export async function alimentoEmUso(id) {
  const [rows] = await pool.query(
    'SELECT 1 FROM variavel_decisao WHERE id_alimento = ? LIMIT 1',
    [id]
  );

  return rows.length > 0;
}

export async function excluirAlimento(id, idUsuario) {
  const [resultado] = await pool.query(
    'DELETE FROM alimento WHERE id_alimento = ? AND id_usuario = ?',
    [id, idUsuario]
  );

  return resultado.affectedRows;
}
