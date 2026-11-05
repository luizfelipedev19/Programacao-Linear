import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../src/db.js';

const diretorioAtual = dirname(fileURLToPath(import.meta.url));
const diretorioMigrations = join(diretorioAtual, '..', 'migrations');

function separarInstrucoes(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((instrucao) => instrucao.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

const connection = await pool.getConnection();

try {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       nome VARCHAR(255) PRIMARY KEY,
       executada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );

  const arquivos = (await readdir(diretorioMigrations))
    .filter((arquivo) => arquivo.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const [executada] = await connection.query(
      'SELECT nome FROM schema_migrations WHERE nome = ?',
      [arquivo]
    );

    if (executada.length > 0) continue;

    const sql = await readFile(join(diretorioMigrations, arquivo), 'utf8');
    for (const instrucao of separarInstrucoes(sql)) {
      await connection.query(instrucao);
    }

    await connection.query(
      'INSERT INTO schema_migrations (nome) VALUES (?)',
      [arquivo]
    );
    console.log(`Migration executada: ${arquivo}`);
  }
} finally {
  connection.release();
  await pool.end();
}
