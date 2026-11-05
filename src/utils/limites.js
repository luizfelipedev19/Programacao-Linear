// Limites alinhados às colunas do banco (VARCHAR e DECIMAL(12,4)); sem eles o MySQL estoura e a API responde 500.
export const NOME_MAX = 100;
export const UNIDADE_MAX = 30;
export const DESCRICAO_MAX = 2000;
export const EMAIL_MAX = 255;
// bcrypt ignora tudo além de 72 bytes.
export const SENHA_MAX = 72;
export const DECIMAL_MAX = 99999999.9999;
export const ENERGIA_MAX = 10000;

// `\S` (sem âncora) só casa se houver ao menos um caractere que não seja espaço.
export const NAO_VAZIO = String.raw`\S`;
