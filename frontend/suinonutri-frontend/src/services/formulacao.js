const ing = (nome, custo, proteina, energia, fosforo, calcio, lisina, minPct = '', maxPct = '') => ({
    nome, usar: true, minPct, maxPct,
    custo: String(custo), proteina: String(proteina), energia: String(energia),
    fosforo: String(fosforo), calcio: String(calcio), lisina: String(lisina),
});
export const ingredientesPadrao = () => [
    ing('Milho', 1.8, 8.51, 3493, 0.27, 0.02, 0.23),
    ing('Farinha de soja', 4.2, 45.6, 3378, 0.55, 0.36, 2.87),
    ing('Farelo de trigo', 2, 15.3, 2103, 0.88, 0.12, 0.57, '', '15'),
    ing('Farinha de carne', 7.5, 45.2, 2133, 5.4, 11.6, 2.28, '', '3'),
    ing('Farinha de sangue', 9, 80.9, 2809, 0.15, 0.2, 6.57, '', '2'),
    ing('Fosfato bicálcico', 14.5, 0, 0, 17.03, 22.61, 0),
    ing('Calcário (cálcio)', 0.8, 0, 0, 0, 37, 0),
    ing('Sal', 3, 0, 0, 0, 0, 0, '0.5', '0.5'),
    ing('Mistura mineral', 28, 0, 0, 0, 0, 0, '0.1', '0.1'),
    ing('Mistura vitamínica', 145, 0, 0, 0, 0, 0, '0.1', '0.1'),
];
export const exigenciasPadrao = () => [
    { chave: 'proteina', rotulo: 'Proteína', unidade: '%', min: '15.5', max: '16', usar: true },
    { chave: 'energia', rotulo: 'Energia', unidade: 'kcal/kg', min: '3260', max: '3360', usar: true },
    { chave: 'fosforo', rotulo: 'Fósforo', unidade: '%', min: '0.5', max: '0.52', usar: true },
    { chave: 'calcio', rotulo: 'Cálcio', unidade: '%', min: '1.3', max: '1.4', usar: true },
    { chave: 'lisina', rotulo: 'Lisina', unidade: '%', min: '0.69', max: '', usar: true },
];
/** Aceita vírgula ou ponto. Vazio => null. Inválido => NaN. */
export function lerNumero(texto) {
    const t = texto.trim().replace(',', '.');
    if (t === '')
        return null;
    return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}
/** Mensagem de erro para um campo numérico ('' se estiver ok). `max` é opcional; vazio é permitido. */
export function erroNumero(texto, max) {
    const x = lerNumero(texto);
    if (x === null)
        return '';
    if (Number.isNaN(x))
        return 'Digite um número.';
    if (x < 0)
        return 'Não pode ser negativo.';
    if (max !== undefined && x > max)
        return `No máximo ${max}.`;
    return '';
}
const masc = (e) => e.chave === 'fosforo' || e.chave === 'calcio';
export function montarPayload(nomeFormulacao, ingredientes, exigencias) {
    const nome = nomeFormulacao.trim();
    if (!nome)
        return { ok: false, erro: 'Dê um nome para a formulação.' };
    const usados = ingredientes.filter((i) => i.usar);
    if (usados.length < 2)
        return { ok: false, erro: 'Selecione pelo menos 2 ingredientes.' };
    const campos = ['custo', 'proteina', 'energia', 'fosforo', 'calcio', 'lisina'];
    const limites = { proteina: 100, energia: 10000, fosforo: 100, calcio: 100, lisina: 100 };
    const rotuloCampo = {
        custo: 'o preço', proteina: 'a proteína', energia: 'a energia', fosforo: 'o fósforo', calcio: 'o cálcio', lisina: 'a lisina',
    };
    const valores = new Map();
    const nomes = new Set();
    for (const i of usados) {
        const n = i.nome.trim();
        if (!n)
            return { ok: false, erro: 'Há um ingrediente sem nome.' };
        if (nomes.has(n.toLowerCase()))
            return { ok: false, erro: `O ingrediente "${n}" aparece mais de uma vez.` };
        nomes.add(n.toLowerCase());
        const v = {};
        for (const c of campos) {
            const x = lerNumero(i[c]);
            if (x === null) {
                v[c] = 0;
                continue;
            }
            if (Number.isNaN(x) || x < 0)
                return { ok: false, erro: `Confira ${rotuloCampo[c]} de "${n}".` };
            if (c !== 'custo' && x > limites[c])
                return { ok: false, erro: `Valor alto demais em ${rotuloCampo[c]} de "${n}".` };
            v[c] = x;
        }
        valores.set(i.nome, v);
    }
    const restricoes = [];
    // ---- exigências nutricionais ----
    for (const e of exigencias) {
        // exigência desligada pelo usuário: não entra no modelo
        if (e.usar === false)
            continue;
        const min = lerNumero(e.min);
        const max = lerNumero(e.max);
        if (Number.isNaN(min) || Number.isNaN(max) || (min !== null && min < 0) || (max !== null && max < 0)) {
            return { ok: false, erro: `Confira os valores de ${e.rotulo.toLowerCase()}.` };
        }
        if (min !== null && max !== null && min > max) {
            return { ok: false, erro: `Em ${e.rotulo.toLowerCase()}, o mínimo não pode ser maior que o máximo.` };
        }
        const coeficientes = {};
        for (const i of usados) {
            // exigência criada pelo usuário traz o teor de cada ingrediente; as padrão usam o cadastro do ingrediente
            const x = e.custom ? lerNumero(e.teores?.[i.nome] ?? '') ?? 0 : valores.get(i.nome)[e.chave];
            if (Number.isNaN(x) || x < 0 || x > 99999)
                return { ok: false, erro: `Confira o teor de ${e.rotulo.toLowerCase()} em "${i.nome.trim()}".` };
            if (x > 0)
                coeficientes[i.nome.trim()] = x;
        }
        const temFonte = Object.keys(coeficientes).length > 0;
        if (!temFonte) {
            if (min !== null && min > 0) {
                return { ok: false, erro: `Nenhum ingrediente selecionado fornece ${e.rotulo.toLowerCase()}.` };
            }
            continue;
        }
        if (min !== null && min > 0) {
            restricoes.push({ nome: `${e.rotulo} ${masc(e) ? 'mínimo' : 'mínima'}`, sinal: '>=', valor: min, unidade: e.unidade, coeficientes });
        }
        if (max !== null) {
            restricoes.push({ nome: `${e.rotulo} ${masc(e) ? 'máximo' : 'máxima'}`, sinal: '<=', valor: max, unidade: e.unidade, coeficientes });
        }
    }
    // ---- limites por ingrediente (em % da ração -> fração) ----
    for (const i of usados) {
        const n = i.nome.trim();
        const min = lerNumero(i.minPct);
        const max = lerNumero(i.maxPct);
        if (Number.isNaN(min) || Number.isNaN(max) || (min !== null && (min < 0 || min > 100)) || (max !== null && (max < 0 || max > 100))) {
            return { ok: false, erro: `Confira os limites de "${n}" (use valores de 0 a 100).` };
        }
        if (min !== null && max !== null && min > max) {
            return { ok: false, erro: `Em "${n}", o mínimo não pode ser maior que o máximo.` };
        }
        const co = { [n]: 1 };
        if (min !== null && max !== null && min === max) {
            restricoes.push({ nome: `${n} fixo`, sinal: '=', valor: min / 100, unidade: 'fração', coeficientes: co });
            continue;
        }
        if (min !== null && min > 0)
            restricoes.push({ nome: `${n} mínimo`, sinal: '>=', valor: min / 100, unidade: 'fração', coeficientes: co });
        if (max !== null)
            restricoes.push({ nome: `${n} máximo`, sinal: '<=', valor: max / 100, unidade: 'fração', coeficientes: co });
    }
    // ---- as frações somam 1 kg de ração ----
    restricoes.push({
        nome: 'Soma das frações', sinal: '=', valor: 1, unidade: 'fração',
        coeficientes: Object.fromEntries(usados.map((i) => [i.nome.trim(), 1])),
    });
    // o backend exige nomes de restrição únicos (ex.: uma exigência "Sal" colidiria com o limite do ingrediente Sal)
    const nomesRestricoes = new Set();
    for (const r of restricoes) {
        const chave = r.nome.toLowerCase();
        if (nomesRestricoes.has(chave))
            return { ok: false, erro: `Há duas exigências com o nome "${r.nome}". Renomeie ou remova uma delas.` };
        nomesRestricoes.add(chave);
    }
    return {
        ok: true,
        payload: {
            nome,
            descricao: 'Formulação de custo mínimo criada pelo SuínoNutri',
            objetivo: 'MIN',
            alimentos: usados.map((i) => {
                const v = valores.get(i.nome);
                return { nome: i.nome.trim(), proteina: v.proteina, energia: v.energia, fosforo: v.fosforo, calcio: v.calcio, lisina: v.lisina, custo_kg: v.custo };
            }),
            variaveis: usados.map((i) => ({
                nome: i.nome.trim(), alimento: i.nome.trim(), unidade: 'fração', coeficiente_objetivo: valores.get(i.nome).custo,
            })),
            restricoes,
        },
    };
}

// Limites de uso (% da ração) conhecidos do enunciado, aplicados pelo NOME do ingrediente.
// O cadastro de ingredientes não guarda limites, então eles entram aqui como sugestão editável.
export const limitesPadrao = Object.fromEntries(
    ingredientesPadrao().map((i) => [i.nome, { minPct: i.minPct, maxPct: i.maxPct }]),
);
// Ingredientes de exemplo (formato do cadastro) para quem quer começar rápido.
export const alimentosExemplo = () => ingredientesPadrao().map((i) => ({
    nome: i.nome,
    proteina: Number(i.proteina),
    energia: Number(i.energia),
    fosforo: Number(i.fosforo),
    calcio: Number(i.calcio),
    lisina: Number(i.lisina),
    custo_kg: Number(i.custo),
}));
