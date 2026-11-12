import { useEffect, useState } from 'react';
import { Shell } from '../components/Shell';
import { buscarModelo, buscarProblema, listarResultados } from '../services/api';
const num = (v, casas = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const brl = (v) => 'R$ ' + num(v);
export function Resultado({ id, aoNavegar, aoSair }) {
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
    // restrições de fração são mostradas em % para ficar claro para o usuário
    const exibe = (nome, v) => (unidade.get(nome) === 'fração' ? `${num(v * 100)} %` : `${num(v)} ${unidade.get(nome) ?? ''}`.trim());
    return (<Shell ativo="dashboard" aoNavegar={aoNavegar} aoSair={aoSair} extra={<button className="voltar" onClick={aoVoltar}>← Início</button>}>

      <h1>Resultado</h1>
      <p className="sub">{problema ? problema.nome : '…'}</p>

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
          <section className="destaque">
            <p>Custo da ração por kg</p>
            <strong>{brl(res.valor_objetivo)}</strong>
          </section>

          <div className="secao">
            <h2>Receita</h2>
            <label className="mini qtd">
              <span>Quantidade de ração a produzir (kg)</span>
              <input inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}/>
            </label>
            <div className="tabela-wrap">
              <table>
                <thead><tr><th style={{ textAlign: 'left' }}>Ingrediente</th><th>% da ração</th><th>Quantidade</th><th>Custo</th></tr></thead>
                <tbody>
                  {itens.map((v) => (<tr key={v.id_variavel}>
                      <td style={{ textAlign: 'left' }}>{v.nome}</td>
                      <td>{num(v.valor * 100)} %</td>
                      <td>{num(v.valor * kg)} kg</td>
                      <td>{brl(v.valor * kg * (preco.get(v.nome) ?? 0))}</td>
                    </tr>))}
                  <tr className="total">
                    <td style={{ textAlign: 'left' }}>Total</td>
                    <td>{num(itens.reduce((s, v) => s + v.valor, 0) * 100)} %</td>
                    <td>{num(kg)} kg</td>
                    <td>{brl(res.valor_objetivo * kg)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <details className="secao conferencia">
            <summary>Conferir exigências nutricionais</summary>
            <div className="tabela-wrap">
              <table>
                <thead><tr><th style={{ textAlign: 'left' }}>Exigência</th><th>Limite</th><th>Obtido</th><th></th></tr></thead>
                <tbody>
                  {res.restricoes.filter((r) => unidade.get(r.nome) !== 'fração').map((r) => (<tr key={r.id_restricao}>
                      <td style={{ textAlign: 'left' }}>{r.nome}</td>
                      <td>{r.sinal} {exibe(r.nome, r.valor_restricao)}</td>
                      <td>{exibe(r.nome, r.valor_calculado)}</td>
                      <td>{r.atendida ? '✓' : '✗'}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </details>
        </>)}

      <button className="btn-nova" onClick={aoNova}>
        <span style={{ fontSize: 38, lineHeight: 1, fontWeight: 300 }}>+</span> Nova Otimização
      </button>
    </Shell>);
}
