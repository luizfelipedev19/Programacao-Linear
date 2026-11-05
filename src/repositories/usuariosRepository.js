import { pool } from '../db.js';

export async function criarUsuario({ nome, email, senhaHash }) {
  const [resultado] = await pool.query(
    `INSERT INTO usuario (nome, email, senha_hash)
     VALUES (?, ?, ?)`,
    [nome, email, senhaHash]
  );

  return resultado.insertId;
}

export async function buscarUsuarioPorEmail(email) {
  const [usuarios] = await pool.query(
    `SELECT id_usuario, nome, email, senha_hash, data_criacao
     FROM usuario
     WHERE email = ?`,
    [email]
  );

  return usuarios[0] ?? null;
}
