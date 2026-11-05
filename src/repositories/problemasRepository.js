
import { pool } from '../db.js';

// Listar todos os problemas
export async function listarProblemas(idUsuario) {
  const [rows] = await pool.query(
    'SELECT * FROM problema WHERE id_usuario = ? ORDER BY id_problema',
    [idUsuario]
  );
  return rows;
}

// Buscar um problema pelo ID
export async function buscarProblema(id, idUsuario) {
  const [rows] = await pool.query(
    'SELECT * FROM problema WHERE id_problema = ? AND id_usuario = ?',
    [id, idUsuario]
  );

  return rows[0] ?? null;
}

// Cadastrar um novo problema
export async function criarProblema(dados, idUsuario) {
  const { nome, descricao, objetivo } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO problema (nome, descricao, objetivo, id_usuario)
     VALUES (?, ?, ?, ?)`,
    [nome, descricao ?? null, objetivo, idUsuario]
  );

  return resultado.insertId;
}

// Atualizar um problema existente
export async function atualizarProblema(id, dados, idUsuario) {
  const { nome, descricao, objetivo } = dados;

  const [resultado] = await pool.query(
    `UPDATE problema
     SET nome = ?, descricao = ?, objetivo = ?
     WHERE id_problema = ? AND id_usuario = ?`,
    [nome, descricao ?? null, objetivo, id, idUsuario]
  );

  return resultado.affectedRows;
}

// Excluir um problema
export async function excluirProblema(id, idUsuario) {
  const [resultado] = await pool.query(
    'DELETE FROM problema WHERE id_problema = ? AND id_usuario = ?',
    [id, idUsuario]
  );

  return resultado.affectedRows;
}
