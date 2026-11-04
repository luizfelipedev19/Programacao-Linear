
import { pool } from '../db.js';

// Listar todos os problemas
export async function listarProblemas() {
  const [rows] = await pool.query(
    'SELECT * FROM problema ORDER BY id_problema'
  );
  return rows;
}

// Buscar um problema pelo ID
export async function buscarProblema(id) {
  const [rows] = await pool.query(
    'SELECT * FROM problema WHERE id_problema = ?',
    [id]
  );

  return rows[0] ?? null;
}

// Cadastrar um novo problema
export async function criarProblema(dados) {
  const { nome, descricao, objetivo } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO problema (nome, descricao, objetivo)
     VALUES (?, ?, ?)`,
    [nome, descricao ?? null, objetivo]
  );

  return resultado.insertId;
}

// Atualizar um problema existente
export async function atualizarProblema(id, dados) {
  const { nome, descricao, objetivo } = dados;

  const [resultado] = await pool.query(
    `UPDATE problema
     SET nome = ?, descricao = ?, objetivo = ?
     WHERE id_problema = ?`,
    [nome, descricao ?? null, objetivo, id]
  );

  return resultado.affectedRows;
}

// Excluir um problema
export async function excluirProblema(id) {
  const [resultado] = await pool.query(
    'DELETE FROM problema WHERE id_problema = ?',
    [id]
  );

  return resultado.affectedRows;
}
