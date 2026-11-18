import { useEffect, useState } from 'react';
import { Shell } from '../components/Shell';
import { useAvisos } from '../components/Avisos';
import { Ajuda } from '../components/Ajuda';
import { buscarModelo, buscarProblema, getUsuario, listarResultados } from '../services/api';
import { falar, parar, pesoFalado, reaisFalado, vozSuportada } from '../services/voz';
const num = (v, casas = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const brl = (v) => 'R$ ' + num(v);

// "Proteína mínima" / "Proteína máxima" -> { base: 'Proteína', tipo: 'min' | 'max' }
const separarLimite = (nome) => {
    const m = nome.match(/^(.*) (m[ií]nim[oa]|m[aá]xim[oa])$/i);
    if (!m)
        return null;
    return { base: m[1], tipo: m[2].toLowerCase().startsWith('m') && /^m[ií]n/i.test(m[2]) ? 'min' : 'max' };
};

const perto = (x, y) => Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
// O solver costuma parar exatamente no limite (a ração mais barata exige o mínimo possível), então isso é "ok", mas vale avisar.
function situacao(n) {
    if (!n.ok)
        return { classe: 'fora', texto: '✗ Fora da faixa' };
    if (n.min != null && perto(n.obtido, n.min))
        return { classe: 'limite', texto: '✓ No limite mínimo' };
    if (n.max != null && perto(n.obtido, n.max))
        return { classe: 'limite', texto: '✓ No limite máximo' };
    return { classe: 'ok', texto: '✓ Dentro da faixa' };
}

export function Resultado({ id, aoNavegar, aoSair }) {
    const avisos = useAvisos();
    const aoVoltar = () => aoNavegar('dashboard');
    const aoNova = () => aoNavegar('nova');
    const [problema, setProblema] = useState(null);
    const [res, setRes] = useState(undefined);
    const [modelo, setModelo] = useState(null);
    const [erro, setErro] = useState('');
    const [quantidade, setQuantidade] = useState('100');
    useEffect(() => {
        Promise.all([buscarProblema(id), listarResultados(id), buscarModelo(id)])
            .then(([p, r, m]) => { setProblema(p); setRes(r[0] ?? null); setModelo(m); })
            .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar o resultado.'));
    }, [id]);
    const kg = Math.max(0, Number(quantidade.replace(',', '.')) || 0);
    const preco = new Map(modelo?.variaveis.map((v) => [v.nome, v.coeficiente_objetivo]));
    const unidade = new Map(modelo?.restricoes.map((r) => [r.nome, r.unidade]));
    const itens = (res?.variaveis ?? []).filter((v) => v.valor > 1e-6).sort((a, b) => b.valor - a.valor);
    const otimo = res?.status === 'OTIMO' && res.valor_objetivo != null;
    // abaixo de 1 kg mostra em gramas (0,07 kg -> 70 g), mais fácil de pesar e de entender
    const qtd = (v) => (v < 1 ? { n: num(v * 1000, v * 1000 < 10 ? 1 : 0), u: 'g' } : { n: num(v), u: 'kg' });

    // Junta "X mínimo" e "X máximo" em uma única faixa por nutriente (as de fração, por ingrediente, ficam de fora).
    const nutrientes = (() => {
        const mapa = new Map();
        for (const r of res?.restricoes ?? []) {
            if (unidade.get(r.nome) === 'fração')
                continue;
            const sep = separarLimite(r.nome);
            if (!sep)
                continue;
            const item = mapa.get(sep.base) ?? { base: sep.base, unidade: unidade.get(r.nome) ?? '', min: null, max: null, obtido: r.valor_calculado, ok: true };
            item[sep.tipo] = r.valor_restricao;
            item.ok = item.ok && r.atendida;
            mapa.set(sep.base, item);
        }
        return [...mapa.values()];
    })();

    useEffect(() => parar, []);
    function ouvirReceita() {
        const kgFalado = String(kg).replace('.', ' vírgula ');
        falar(`Receita para produzir ${kgFalado} quilos de ração. O custo é de ${reaisFalado(res.valor_objetivo)} por quilo, e ${reaisFalado(res.valor_objetivo * kg)} no total. Use: ${itens.map((v) => `${pesoFalado(v.valor * kg)} de ${v.nome}`).join('; ')}.`);
    }
    function baixarCsv() {
        const linhas = [['Ingrediente', '% da ração', `Quantidade (kg) para ${num(kg)} kg`, 'Custo de cada ingrediente (R$)']];
        for (const v of itens)
            linhas.push([v.nome, num(v.valor * 100), num(v.valor * kg), num(v.valor * kg * (preco.get(v.nome) ?? 0))]);
        linhas.push(['Total', num(itens.reduce((t, v) => t + v.valor, 0) * 100), num(kg), num(res.valor_objetivo * kg)]);
        // ";" e BOM para o Excel em português abrir com acentos e colunas certas
        const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `receita-${(problema?.nome ?? 'racao').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        avisos.sucesso('Arquivo CSV gerado. Abra no Excel.');
    }

    return (<Shell ativo="dashboard" aoNavegar={aoNavegar} aoSair={aoSair} extra={<button className="voltar" onClick={aoVoltar}>← Início</button>}>

      <div className="so-impressao">
        <strong>SuínoNutri — Receita de ração</strong>
        <span>{getUsuario()?.nome} • gerado em {new Date().toLocaleDateString('pt-BR')}</span>
      </div>
      <div className="dash-cabecalho">
        <div>
          <h1>Resultado</h1>
          <p className="sub">{problema ? problema.nome : '…'}</p>
        </div>
        {otimo && (<div className="cab-acoes-sempre no-print">
          {vozSuportada() && <button className="btn-sec" onClick={ouvirReceita}>🔊 Ouvir a receita</button>}
          <button className="btn-sec" onClick={baixarCsv}>Baixar CSV</button>
          <button className="btn-topo" onClick={() => window.print()}>Imprimir / PDF</button>
        </div>)}
      </div>

      {otimo && <Ajuda passos={[
        'O quadro verde do topo mostra quanto custa 1 kg desta ração.',
        'Em "Quero produzir", digite quantos kg de ração você vai fazer. A tabela mostra quanto de cada ingrediente você precisa pesar.',
        'A coluna verde "Quantidade necessária" é a que você usa na hora de misturar.',
        'Mais abaixo, as exigências nutricionais mostram se a ração cumpre o que você pediu.',
      ]} dica={'"No limite" é normal: a ração mais barata usa só o mínimo necessário de cada nutriente.'} />}

      {erro && <div className="erro">{erro}</div>}
      {res === undefined && !erro && <div className="vazio">Carregando…</div>}
      {res === null && <div className="aviso">Esta formulação ainda não foi calculada.</div>}

      {res && !otimo && (<div className="erro">
          {res.status === 'INVIAVEL'
                ? 'Não existe uma ração que atenda a todas as exigências com esses ingredientes. Tente liberar mais ingredientes, aumentar os limites máximos ou ampliar a faixa das exigências.'
                : res.status === 'ILIMITADO'
                    ? 'O cálculo não encontrou um limite para o custo. Revise os dados informados.'
                    : 'Não foi possível calcular essa formulação. Revise os dados e tente de novo.'}
        </div>)}

      {otimo && res && (<>
          <section className="custos">
            <div className="custo-card custo-principal">
              <p>Custo da ração por kg</p>
              <strong>{brl(res.valor_objetivo)}</strong>
              <small>valor exato: R$ {num(res.valor_objetivo, 4)}</small>
            </div>
            <div className="custo-card">
              <p>Custo total para {num(kg)} kg</p>
              <strong>{brl(res.valor_objetivo * kg)}</strong>
              <small>muda com a quantidade abaixo</small>
            </div>
            <div className="custo-card">
              <p>Custo por tonelada</p>
              <strong>{brl(res.valor_objetivo * 1000)}</strong>
              <small>1.000 kg de ração</small>
            </div>
          </section>

          <div className="secao">
            <h2>Receita</h2>
            <label className="producao">
              <span>Quero produzir</span>
              <input inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} aria-label="Quantidade de ração a produzir, em kg"/>
              <span>kg de ração</span>
            </label>
            <div className="tabela-wrap">
              <table>
                <thead><tr>
                  <th style={{ textAlign: 'left' }}>Ingrediente</th>
                  <th>% da ração</th>
                  <th className="col-qtd">Quantidade necessária de cada ingrediente</th>
                  <th>Custo de cada ingrediente</th>
                  <th title="Quanto cada ingrediente pesa no custo total da ração">% do custo</th>
                </tr></thead>
                <tbody>
                  {itens.map((v) => {
                    const q = qtd(v.valor * kg);
                    return (<tr key={v.id_variavel}>
                      <td style={{ textAlign: 'left' }}>{v.nome}</td>
                      <td>{num(v.valor * 100)} %</td>
                      <td className="col-qtd"><b>{q.n}</b> {q.u}</td>
                      <td>{brl(v.valor * kg * (preco.get(v.nome) ?? 0))}</td>
                      <td>{num(((v.valor * (preco.get(v.nome) ?? 0)) / res.valor_objetivo) * 100)} %</td>
                    </tr>);
                  })}
                  <tr className="total">
                    <td style={{ textAlign: 'left' }}>Total</td>
                    <td>{num(itens.reduce((t, v) => t + v.valor, 0) * 100)} %</td>
                    <td className="col-qtd"><b>{num(kg)}</b> kg</td>
                    <td>{brl(res.valor_objetivo * kg)}</td>
                    <td>100,00 %</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="secao conferencia">
            <h2>Exigências nutricionais</h2>
            {nutrientes.length === 0
                ? <p className="dica">Nenhuma exigência nutricional foi usada nesta formulação.</p>
                : (<>
                  <p className={`resumo-exi ${nutrientes.every((n) => n.ok) ? 'ok' : 'fora'}`}>
                    {nutrientes.every((n) => n.ok)
                        ? `✓ ${nutrientes.length} de ${nutrientes.length} exigências atendidas`
                        : `✗ ${nutrientes.filter((n) => !n.ok).length} exigência(s) não atendida(s)`}
                  </p>
                  <div className="tabela-wrap">
                    <table>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Nutriente</th><th>Exigido</th><th>Obtido na ração</th><th>Situação</th>
                      </tr></thead>
                      <tbody>
                        {nutrientes.map((n) => {
                            const st = situacao(n);
                            const exigido = n.min != null && n.max != null ? `${num(n.min)} a ${num(n.max)}`
                                : n.min != null ? `mínimo ${num(n.min)}` : `máximo ${num(n.max)}`;
                            return (<tr key={n.base}>
                              <td style={{ textAlign: 'left' }}>{n.base}</td>
                              <td>{exigido} {n.unidade}</td>
                              <td className="obtido"><b>{num(n.obtido)}</b> {n.unidade}</td>
                              <td><span className={`situacao ${st.classe}`}>{st.texto}</span></td>
                            </tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="dica">"No limite" é esperado: a ração de menor custo usa o mínimo exigido de cada nutriente, sem gastar a mais.</p>
                </>)}
          </div>
        </>)}

      <button className="btn-nova" onClick={aoNova}>
        <span style={{ fontSize: 38, lineHeight: 1, fontWeight: 300 }}>+</span> Nova Otimização
      </button>
    </Shell>);
}
