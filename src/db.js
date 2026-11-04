import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? 'projeto_linear',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'qualquercoisa',
  connectionLimit: 10,
  decimalNumbers: false,
});
