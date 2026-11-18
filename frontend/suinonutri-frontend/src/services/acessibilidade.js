// Preferências de acessibilidade, lembradas no navegador: tamanho da letra, alto contraste e voz.
const CHAVE_LETRA = 'suinonutri_letra'
const CHAVE_CONTRASTE = 'suinonutri_contraste'
const CHAVE_VOZ = 'suinonutri_voz'
const CHAVE_VOZ_NOME = 'suinonutri_voz_nome'
const CHAVE_VOZ_VELOCIDADE = 'suinonutri_voz_velocidade'

export const NIVEIS_LETRA = ['normal', 'grande', 'enorme']

const ler = (chave, padrao) => {
  try { return localStorage.getItem(chave) ?? padrao } catch { return padrao }
}
const gravar = (chave, valor) => {
  try { localStorage.setItem(chave, valor) } catch { /* sem armazenamento: vale só nesta visita */ }
}

export const getLetra = () => {
  const v = ler(CHAVE_LETRA, 'normal')
  return NIVEIS_LETRA.includes(v) ? v : 'normal'
}
export const getContraste = () => (ler(CHAVE_CONTRASTE, 'normal') === 'alto' ? 'alto' : 'normal')
export const getVozAuto = () => ler(CHAVE_VOZ, 'nao') === 'sim'

export const getVozNome = () => ler(CHAVE_VOZ_NOME, '')
export const setVozNome = (nome) => gravar(CHAVE_VOZ_NOME, nome)
// velocidade da fala: 0,8 (devagar), 0,95 (normal) ou 1,1 (rápida)
export const getVozVelocidade = () => {
  const v = Number(ler(CHAVE_VOZ_VELOCIDADE, '0.95'))
  return Number.isFinite(v) && v >= 0.6 && v <= 1.4 ? v : 0.95
}
export const setVozVelocidade = (v) => gravar(CHAVE_VOZ_VELOCIDADE, String(v))

export function setLetra(nivel) {
  gravar(CHAVE_LETRA, nivel)
  document.documentElement.dataset.letra = nivel
}
export function setContraste(modo) {
  gravar(CHAVE_CONTRASTE, modo)
  document.documentElement.dataset.contraste = modo
}
export function setVozAuto(ligada) {
  gravar(CHAVE_VOZ, ligada ? 'sim' : 'nao')
}

// Chamada antes de desenhar a tela, para não piscar com o tamanho errado.
export function aplicarPreferencias() {
  document.documentElement.dataset.letra = getLetra()
  document.documentElement.dataset.contraste = getContraste()
}
