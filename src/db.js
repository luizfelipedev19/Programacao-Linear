import mysql from 'mysql2/promise';

import { obrigatoria } from './utils/ambiente.js';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? 'projeto_linear',
  user: obrigatoria('DB_USER'),
  password: obrigatoria('DB_PASSWORD'),
  connectionLimit: 10,
  // Evita que requisições fiquem na fila para sempre quando o pool esgota.
  queueLimit: 50,
  // DECIMAL como string preserva a precisão (RNF05); converta só ao montar o modelo do solver.
  decimalNumbers: false,
});
