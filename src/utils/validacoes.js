
export function idValido(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return false;
  }

  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero > 0;
}

export function numeroValido(valor) {
  if (
    valor === null ||
    valor === undefined ||
    typeof valor === 'boolean' ||
    String(valor).trim() === ''
  ) {
    return false;
  }

  return Number.isFinite(Number(valor));
}

export function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

export function objetivoValido(valor) {
  return valor === 'MIN' || valor === 'MAX';
}

export function sinalValido(valor) {
  return ['<=', '>=', '='].includes(valor);
}

export function inteiroValido(valor) {
  return typeof valor === 'boolean';
}
