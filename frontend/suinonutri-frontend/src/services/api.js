// ============================================================
// Camada de acesso ao backend (Fastify + MySQL).
// URL da API: defina VITE_API_URL no arquivo .env (padrão http://localhost:3000)
// ============================================================
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'suinonutri_token';
const USUARIO_KEY = 'suinonutri_usuario';
// ---------- sessão ----------
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function getUsuario() {
    try {
        const bruto = localStorage.getItem(USUARIO_KEY);
        return bruto ? JSON.parse(bruto) : null;
    }
    catch {
        return null;
    }
}
export function sair() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
}
function guardarSessao(token, usuario) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}
// ---------- requisição genérica ----------
export class ErroApi extends Error {
    status;
    constructor(mensagem, status) {
        super(mensagem);
        this.status = status;
    }
}
let aoExpirarSessao = null;
export function registrarExpiracao(fn) {
    aoExpirarSessao = fn;
}
async function requisicao(caminho, opcoes = {}, autenticada = true) {
    const token = getToken();
    let resp;
    try {
        resp = await fetch(`${API_URL}${caminho}`, {
            ...opcoes,
            headers: {
                ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
                ...(autenticada && token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
    }
    catch {
        throw new ErroApi('Não foi possível conectar ao servidor. Verifique se a API está rodando.', 0);
    }
    if (!resp.ok) {
        let mensagem = `Erro ${resp.status}`;
        try {
            const corpo = (await resp.json());
            if (corpo.erro)
                mensagem = corpo.erro;
        }
        catch { /* corpo vazio */ }
        if (resp.status === 401 && autenticada) {
            sair();
            aoExpirarSessao?.();
            mensagem = 'Sua sessão expirou. Entre novamente.';
        }
        if (resp.status === 429)
            mensagem = 'Muitas tentativas. Aguarde um instante e tente de novo.';
        throw new ErroApi(mensagem, resp.status);
    }
    if (resp.status === 204)
        return null;
    const texto = await resp.text();
    return texto ? JSON.parse(texto) : null;
}
export async function entrar(email, senha) {
    const { usuario, token } = await requisicao('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), senha }) }, false);
    guardarSessao(token, usuario);
    return usuario;
}
export async function cadastrar(nome, email, senha) {
    const { usuario } = await requisicao('/auth/cadastro', { method: 'POST', body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha }) }, false);
    return usuario;
}
// ---------- problemas e resultados ----------
export const listarProblemas = () => requisicao('/problemas');
export const buscarProblema = (id) => requisicao(`/problemas/${id}`);
export const listarResultados = (id) => requisicao(`/problemas/${id}/resultados`);
export const criarProblemaCompleto = (payload) => requisicao('/problemas/completo', {
    method: 'POST',
    body: JSON.stringify(payload),
});
export const executarProblema = (id) => requisicao(`/problemas/${id}/executar`, { method: 'POST' });
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIA = 24 * 3600 * 1000;
async function carregarBase(limite) {
    const problemas = (await listarProblemas()).sort((a, b) => b.id_problema - a.id_problema);
    const recentes = problemas.slice(0, limite);
    const ultimos = await Promise.all(recentes.map((p) => listarResultados(p.id_problema).then((r) => r[0] ?? null).catch(() => null)));
    const base = recentes.map((p, i) => {
        const r = ultimos[i];
        const custoKg = r?.status === 'OTIMO' ? r.valor_objetivo : null;
        const status = !r || r.status === 'PENDENTE' ? 'Em análise' : r.status === 'OTIMO' ? 'Concluída' : 'Sem solução';
        return { p, custoKg, status, resultado: r };
    });
    return { problemas, base };
}
function montarHistorico(base) {
    return base.map(({ p, custoKg, status }, i) => {
        // economia em relação à formulação anterior que tenha custo calculado
        const anterior = base.slice(i + 1).find((b) => b.custoKg !== null)?.custoKg ?? null;
        const economia = custoKg !== null && anterior ? ((anterior - custoKg) / anterior) * 100 : null;
        return {
            id: p.id_problema,
            data: new Date(p.data_criacao).toLocaleDateString('pt-BR'),
            codigo: `FOR-${String(p.id_problema).padStart(4, '0')}`,
            formula: p.nome,
            custoKg,
            economia,
            status,
        };
    });
}
export async function buscarHistorico() {
    const { problemas, base } = await carregarBase(50);
    return { total: problemas.length, itens: montarHistorico(base) };
}
export async function buscarResumo() {
    const { problemas, base } = await carregarBase(30);
    const historico = montarHistorico(base);
    const agora = new Date();
    const novasNoMes = problemas.filter((p) => {
        const d = new Date(p.data_criacao);
        return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }).length;
    // custo médio dos últimos 30 dias e dos 30 dias anteriores
    const custosEntre = (de, ate) => base
        .filter((b) => {
            const t = new Date(b.p.data_criacao).getTime();
            return b.custoKg !== null && t >= de && t < ate;
        })
        .map((b) => b.custoKg);
    const custoMedioKg = media(custosEntre(Date.now() - 30 * DIA, Date.now() + DIA));
    const custoAnterior = media(custosEntre(Date.now() - 60 * DIA, Date.now() - 30 * DIA));
    const variacaoCusto = custoMedioKg !== null && custoAnterior !== null ? custoMedioKg - custoAnterior : null;
    // evolução do custo: média por mês nos últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        meses.push({ ano: d.getFullYear(), mes: d.getMonth(), rotulo: MESES[d.getMonth()], valores: [] });
    }
    for (const b of base) {
        if (b.custoKg === null) continue;
        const d = new Date(b.p.data_criacao);
        meses.find((m) => m.ano === d.getFullYear() && m.mes === d.getMonth())?.valores.push(b.custoKg);
    }
    return {
        totalFormulacoes: problemas.length,
        novasNoMes,
        economiaMedia: media(historico.map((h) => h.economia).filter((e) => e !== null)),
        custoMedioKg,
        variacaoCusto,
        evolucao: meses.map((m) => ({ rotulo: m.rotulo, valor: media(m.valores) })),
        historico: historico.slice(0, 5),
    };
}
export const buscarModelo = (id) => requisicao(`/problemas/${id}/modelo`);

// ---------- ingredientes (catálogo do usuário) ----------
// O MySQL devolve DECIMAL como texto; aqui viram números.
const paraNumero = (v) => (v === null || v === undefined ? 0 : Number(v));
export async function listarAlimentos() {
    const lista = await requisicao('/alimentos');
    return lista.map((a) => ({
        id_alimento: a.id_alimento,
        nome: a.nome,
        proteina: paraNumero(a.proteina),
        energia: paraNumero(a.energia),
        fosforo: paraNumero(a.fosforo),
        calcio: paraNumero(a.calcio),
        lisina: paraNumero(a.lisina),
        custo_kg: paraNumero(a.custo_kg),
    }));
}
export const criarAlimento = (dados) => requisicao('/alimentos', { method: 'POST', body: JSON.stringify(dados) });
export const atualizarAlimento = (id, dados) => requisicao(`/alimentos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
export const excluirAlimento = (id) => requisicao(`/alimentos/${id}`, { method: 'DELETE' });
export const excluirProblema = (id) => requisicao(`/problemas/${id}`, { method: 'DELETE' });

// ---------- relatórios ----------
// Formulações (até 50 mais recentes) com a receita de cada uma.
export async function buscarRelatorio() {
    const { problemas, base } = await carregarBase(50);
    const historico = montarHistorico(base);
    return {
        total: problemas.length,
        itens: base.map((b, i) => ({
            ...historico[i],
            criadoEm: new Date(b.p.data_criacao).getTime(),
            variaveis: b.status === 'Concluída' ? (b.resultado?.variaveis ?? []) : [],
        })),
    };
}
