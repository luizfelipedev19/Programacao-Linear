
import { pool } from '../db.js';

export async function listarAlimentos() {
  const [rows] = await pool.query('SELECT * FROM alimento');
  return rows;
}

export async function buscarAlimento(id) {
  const [rows] = await pool.query(
    'SELECT * FROM alimento WHERE id_alimento = ?',
    [id]
  );
  return rows[0] ?? null;
}

export async function criarAlimento(dados) {
  const { nome, proteina, energia, fosforo, calcio, lisina, custo_kg } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO alimento
     (nome, proteina, energia, fosforo, calcio, lisina, custo_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome, proteina, energia, fosforo, calcio, lisina, custo_kg]
  );

  return resultado.insertId;
}

export async function atualizarAlimento(id, dados) {
  const { nome, proteina, energia, fosforo, calcio, lisina, custo_kg } = dados;

  const [resultado] = await pool.query(
    `UPDATE alimento
     SET nome = ?, proteina = ?, energia = ?, fosforo = ?,
         calcio = ?, lisina = ?, custo_kg = ?
     WHERE id_alimento = ?`,
    [nome, proteina, energia, fosforo, calcio, lisina, custo_kg, id]
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

export async function excluirAlimento(id) {
  const [resultado] = await pool.query(
    'DELETE FROM alimento WHERE id_alimento = ?',
    [id]
  );

  return resultado.affectedRows;
}
