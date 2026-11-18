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

export async function buscarUsuarioPorId(id) {
  const [usuarios] = await pool.query(
    `SELECT id_usuario, nome, email, senha_hash, data_criacao
     FROM usuario
     WHERE id_usuario = ?`,
    [id]
  );

  return usuarios[0] ?? null;
}

export async function atualizarUsuario(id, { nome, email }) {
  const [resultado] = await pool.query(
    'UPDATE usuario SET nome = ?, email = ? WHERE id_usuario = ?',
    [nome, email, id]
  );

  return resultado.affectedRows;
}

export async function atualizarSenha(id, senhaHash) {
  await pool.query('UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?', [senhaHash, id]);
}

// problema e alimento usam ON DELETE RESTRICT para o usuário; por isso saem antes dele, na mesma transação.
// O resto (variáveis, restrições, resultados e exigências) cai em cascata.
export async function excluirUsuarioComDados(id) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    await conexao.query('DELETE FROM problema WHERE id_usuario = ?', [id]);
    await conexao.query('DELETE FROM alimento WHERE id_usuario = ?', [id]);
    await conexao.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
    await conexao.commit();
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}
