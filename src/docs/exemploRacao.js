// Problema da ração (enunciado) no formato de POST /problemas/completo.
// Variáveis são frações de 1 kg de ração (soma = 1); limites em % viram frações.
const alimentos = [
  ['Milho', 8.51, 3493, 0.27, 0.02, 0.23, 1.8],
  ['Farinha de soja', 45.6, 3378, 0.55, 0.36, 2.87, 4.2],
  ['Farelo de trigo', 15.3, 2103, 0.88, 0.12, 0.57, 2],
  ['Farinha de carne', 45.2, 2133, 5.4, 11.6, 2.28, 7.5],
  ['Farinha de sangue', 80.9, 2809, 0.15, 0.2, 6.57, 9],
  ['Fosfato bicalcico', 0, 0, 17.03, 22.61, 0, 14.5],
  ['Calcio', 0, 0, 0, 37, 0, 0.8],
  ['Sal', 0, 0, 0, 0, 0, 3],
  ['Mistura mineral', 0, 0, 0, 0, 0, 28],
  ['Mistura vitaminica', 0, 0, 0, 0, 0, 145]
].map(([nome, proteina, energia, fosforo, calcio, lisina, custo_kg]) =>
  ({ nome, proteina, energia, fosforo, calcio, lisina, custo_kg }));

const nutriente = (campo) =>
  Object.fromEntries(alimentos.filter((a) => a[campo] > 0).map((a) => [a.nome, a[campo]]));

const so = (nome) => ({ [nome]: 1 });

export const exemploRacao = {
  nome: 'Racao suinos 30 a 60 kg',
  descricao: 'Formulacao de custo minimo (exemplo do enunciado)',
  objetivo: 'MIN',
  alimentos,
  variaveis: alimentos.map((a) => ({
    nome: a.nome,
    alimento: a.nome,
    unidade: 'fracao',
    coeficiente_objetivo: a.custo_kg
  })),
  restricoes: [
    { nome: 'Proteina minima', sinal: '>=', valor: 15.5, unidade: '%', coeficientes: nutriente('proteina') },
    { nome: 'Proteina maxima', sinal: '<=', valor: 16, unidade: '%', coeficientes: nutriente('proteina') },
    { nome: 'Energia minima', sinal: '>=', valor: 3260, unidade: 'kcal/kg', coeficientes: nutriente('energia') },
    { nome: 'Energia maxima', sinal: '<=', valor: 3360, unidade: 'kcal/kg', coeficientes: nutriente('energia') },
    { nome: 'Fosforo minimo', sinal: '>=', valor: 0.5, unidade: '%', coeficientes: nutriente('fosforo') },
    { nome: 'Fosforo maximo', sinal: '<=', valor: 0.52, unidade: '%', coeficientes: nutriente('fosforo') },
    { nome: 'Calcio minimo', sinal: '>=', valor: 1.3, unidade: '%', coeficientes: nutriente('calcio') },
    { nome: 'Calcio maximo', sinal: '<=', valor: 1.4, unidade: '%', coeficientes: nutriente('calcio') },
    { nome: 'Lisina minima', sinal: '>=', valor: 0.69, unidade: '%', coeficientes: nutriente('lisina') },
    { nome: 'Farelo de trigo maximo', sinal: '<=', valor: 0.15, unidade: 'fracao', coeficientes: so('Farelo de trigo') },
    { nome: 'Farinha de carne maxima', sinal: '<=', valor: 0.03, unidade: 'fracao', coeficientes: so('Farinha de carne') },
    { nome: 'Farinha de sangue maxima', sinal: '<=', valor: 0.02, unidade: 'fracao', coeficientes: so('Farinha de sangue') },
    { nome: 'Sal fixo', sinal: '=', valor: 0.005, unidade: 'fracao', coeficientes: so('Sal') },
    { nome: 'Mistura mineral fixa', sinal: '=', valor: 0.001, unidade: 'fracao', coeficientes: so('Mistura mineral') },
    { nome: 'Mistura vitaminica fixa', sinal: '=', valor: 0.001, unidade: 'fracao', coeficientes: so('Mistura vitaminica') },
    {
      nome: 'Soma das fracoes', sinal: '=', valor: 1, unidade: 'fracao',
      coeficientes: Object.fromEntries(alimentos.map((a) => [a.nome, 1]))
    }
  ]
};
