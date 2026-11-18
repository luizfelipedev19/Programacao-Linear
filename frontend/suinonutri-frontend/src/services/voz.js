// Leitura em voz alta com a voz do próprio navegador (Web Speech API), sem custo e sem enviar nada para fora.
import { getVozNome, getVozVelocidade } from './acessibilidade'

const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window

export const vozSuportada = () => suportado

// Vozes "Natural"/"Neural" (por exemplo, as do navegador Edge) soam bem mais humanas que as vozes simples
// do sistema ou as do Google; por isso a pontuação prefere as primeiras e deixa as do Google por último.
function pontuar(v) {
  const n = v.name.toLowerCase()
  let p = 0
  if (/natural/.test(n)) p += 100
  if (/neural/.test(n)) p += 90
  if (/online/.test(n)) p += 10
  if (/francisca|antonio|thalita|brenda|donato|elza|fabio|giovanna|humberto|julio|leila|leticia|letícia|manuela|nicolau|valerio|yara/.test(n)) p += 20
  if (/google/.test(n)) p -= 30
  if (v.lang === 'pt-BR' || v.lang === 'pt_BR') p += 5
  return p
}

// "piper" (padrão) = voz gravada do SuínoNutri; qualquer outro valor = uma voz do navegador.
export const VOZ_PADRAO = 'piper'
export const usaPiper = () => (getVozNome() || VOZ_PADRAO) === VOZ_PADRAO

// Nome do arquivo de áudio de um texto fixo (ajuda das telas). O gerador dos áudios usa a mesma conta.
export function hashTexto(t) {
  let h = 0x811c9dc5
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}

export const vozEhNatural = (v) => /natural|neural/i.test(v.name)

// Vozes em português disponíveis, da mais natural para a menos.
export function listarVozes() {
  if (!suportado) return []
  return window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('pt')).sort((a, b) => pontuar(b) - pontuar(a))
}

// A escolhida pelo usuário, ou a melhor disponível.
export function vozAtual() {
  const lista = listarVozes()
  const salva = usaPiper() ? '' : getVozNome()
  return lista.find((v) => v.name === salva) ?? lista[0] ?? null
}

// Deixa o texto mais natural para a voz: "73,4 kg" -> "73,4 quilos", "15 %" -> "15 por cento".
export function paraFala(texto) {
  return texto
    .replace(/R\$\s*(\d+),(\d{2})/g, '$1 reais e $2 centavos')
    .replace(/R\$\s*(\d+)/g, '$1 reais')
    .replace(/\bkg\b/gi, 'quilos')
    .replace(/\s*%/g, ' por cento')
    .replace(/[“”"]/g, '')
    .replace(/→|←/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// O Chrome corta falas longas depois de ~15 s; por isso o texto vai em frases, uma de cada vez
// (e as pausas entre as frases deixam a fala mais natural).
export function falar(texto, { aoTerminar } = {}) {
  if (!suportado) return
  window.speechSynthesis.cancel()
  const voz = vozAtual()
  const frases = paraFala(texto).split(/(?<=[.!?:;])\s+/).filter(Boolean)
  frases.forEach((frase, i) => {
    const u = new SpeechSynthesisUtterance(frase)
    u.lang = voz?.lang ?? 'pt-BR'
    if (voz) u.voice = voz
    u.rate = getVozVelocidade()
    u.pitch = 1
    if (i === frases.length - 1 && aoTerminar) u.onend = aoTerminar
    window.speechSynthesis.speak(u)
  })
}

let audio = null

// Toca o áudio gravado (voz Piper, gerada uma vez e guardada em public/voz); se o arquivo não carregar,
// cai para a voz do navegador lendo o mesmo texto.
export function narrar(arquivo, texto) {
  if (!usaPiper()) { falar(texto); return }
  parar()
  audio = new Audio(`${import.meta.env.BASE_URL}voz/${arquivo}.mp3`)
  audio.playbackRate = getVozVelocidade() / 0.95
  audio.play().catch(() => falar(texto))
}

export function parar() {
  if (audio) { audio.pause(); audio = null }
  if (suportado) window.speechSynthesis.cancel()
}

// "73 quilos e 430 gramas" / "70 gramas": peso por extenso, arredondado a 10 g.
export function pesoFalado(kg) {
  const gramas = Math.round(kg * 100) * 10
  const inteiro = Math.floor(gramas / 1000)
  const resto = gramas % 1000
  const partes = []
  if (inteiro > 0) partes.push(`${inteiro} ${inteiro === 1 ? 'quilo' : 'quilos'}`)
  if (resto > 0 || inteiro === 0) partes.push(`${resto} ${resto === 1 ? 'grama' : 'gramas'}`)
  return partes.join(' e ')
}

export function reaisFalado(valor) {
  const centavos = Math.round(valor * 100)
  const reais = Math.floor(centavos / 100)
  const c = centavos % 100
  const partes = []
  if (reais > 0 || c === 0) partes.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`)
  if (c > 0) partes.push(`${c} ${c === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ')
}
