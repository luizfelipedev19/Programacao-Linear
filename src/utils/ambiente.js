export function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} é obrigatória.`);
  return valor;
}

export function inteiro(nome, padrao) {
  const valor = Number(process.env[nome] ?? padrao);
  return Number.isInteger(valor) && valor > 0 ? valor : padrao;
}
