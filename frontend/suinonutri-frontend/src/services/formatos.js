export const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',')
export const pct = (v) => v.toFixed(1).replace('.', ',') + '%'

// Situação de uma ração, em palavras simples (e a classe de cor do selo).
export const rotuloStatus = {
  'Concluída': { classe: 'concluida', texto: '✓ Deu certo' },
  'Sem solução': { classe: 'sem-solucao', texto: '✗ Sem solução' },
  'Em análise': { classe: 'analise', texto: '… Em análise' },
}
