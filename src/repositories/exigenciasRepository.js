import { pool } from '../db.js';

const COLUNAS = 'id_exigencia, nome, unidade, nutriente, minimo, maximo, teores';

// DECIMAL chega como texto; aqui vira número. Toda consulta é filtrada por id_usuario.
function paraObjeto(linha) {
  return {
    id_exigencia: linha.id_exigencia,
    nome: linha.nome,
    unidade: linha.unidade,
    nutriente: linha.nutriente,
    minimo: linha.minimo === null ? null : Number(linha.minimo),
    maximo: linha.maximo === null ? null : Number(linha.maximo),
    teores: typeof linha.teores === 'string' ? JSON.parse(linha.teores) : linha.teores
  };
}

export async function listarExigencias(idUsuario) {
  const [rows] = await pool.query(
    `SELECT ${COLUNAS} FROM exigencia WHERE id_usuario = ? ORDER BY nome LIMIT 200`,
    [idUsuario]
  );
  return rows.map(paraObjeto);
}

export async function buscarExigencia(id, idUsuario) {
  const [rows] = await pool.query(
    `SELECT ${COLUNAS} FROM exigencia WHERE id_exigencia = ? AND id_usuario = ?`,
    [id, idUsuario]
  );
  return rows[0] ? paraObjeto(rows[0]) : null;
}

export async function contarExigencias(idUsuario) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM exigencia WHERE id_usuario = ?',
    [idUsuario]
  );
  return rows[0].total;
}

export async function criarExigencia(dados, idUsuario) {
  const [resultado] = await pool.query(
    `INSERT INTO exigencia (id_usuario, nome, unidade, nutriente, minimo, maximo, teores)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idUsuario, dados.nome, dados.unidade, dados.nutriente, dados.minimo, dados.maximo,
      dados.teores ? JSON.stringify(dados.teores) : null]
  );
  return resultado.insertId;
}

export async function atualizarExigencia(id, dados, idUsuario) {
  const [resultado] = await pool.query(
    `UPDATE exigencia
     SET nome = ?, unidade = ?, nutriente = ?, minimo = ?, maximo = ?, teores = ?
     WHERE id_exigencia = ? AND id_usuario = ?`,
    [dados.nome, dados.unidade, dados.nutriente, dados.minimo, dados.maximo,
      dados.teores ? JSON.stringify(dados.teores) : null, id, idUsuario]
  );
  return resultado.affectedRows;
}

export async function excluirExigencia(id, idUsuario) {
  const [resultado] = await pool.query(
    'DELETE FROM exigencia WHERE id_exigencia = ? AND id_usuario = ?',
    [id, idUsuario]
  );
  return resultado.affectedRows;
}
