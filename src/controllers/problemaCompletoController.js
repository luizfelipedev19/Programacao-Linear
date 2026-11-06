import { ErroEntrada, criarProblemaCompleto } from '../repositories/problemaCompletoRepository.js';

function nomesRepetidos(nomes) {
  return nomes.find((nome, i) => nomes.indexOf(nome) !== i);
}

// Regras que o schema não expressa: nomes únicos e coeficientes que apontam para variáveis do pedido.
function validarReferencias({ alimentos, variaveis, restricoes }) {
  const alimentoRepetido = nomesRepetidos(alimentos.map((a) => a.nome));
  if (alimentoRepetido) throw new ErroEntrada(`O alimento '${alimentoRepetido}' aparece mais de uma vez.`);

  const variavelRepetida = nomesRepetidos(variaveis.map((v) => v.nome));
  if (variavelRepetida) throw new ErroEntrada(`A variável '${variavelRepetida}' aparece mais de uma vez.`);

  const restricaoRepetida = nomesRepetidos(restricoes.map((r) => r.nome));
  if (restricaoRepetida) throw new ErroEntrada(`A restrição '${restricaoRepetida}' aparece mais de uma vez.`);

  const nomesVariaveis = new Set(variaveis.map((v) => v.nome));
  for (const restricao of restricoes) {
    const desconhecida = Object.keys(restricao.coeficientes).find((nome) => !nomesVariaveis.has(nome));
    if (desconhecida) {
      throw new ErroEntrada(
        `A restrição '${restricao.nome}' usa a variável '${desconhecida}', que não existe neste problema.`
      );
    }
  }
}

const aparar = (texto) => (typeof texto === 'string' ? texto.trim() : texto);

export async function criar(request, reply) {
  try {
    const dados = request.body;

    // Nomes sem espaços nas pontas, para as referências por nome baterem.
    const normalizado = {
      ...dados,
      nome: aparar(dados.nome),
      alimentos: (dados.alimentos ?? []).map((a) => ({ ...a, nome: aparar(a.nome) })),
      variaveis: dados.variaveis.map((v) => ({ ...v, nome: aparar(v.nome), alimento: aparar(v.alimento) })),
      restricoes: dados.restricoes.map((r) => ({
        ...r,
        nome: aparar(r.nome),
        coeficientes: Object.fromEntries(
          Object.entries(r.coeficientes).map(([nome, valor]) => [nome.trim(), valor])
        )
      }))
    };

    validarReferencias(normalizado);

    const resultado = await criarProblemaCompleto(normalizado, request.user.id_usuario);
    return reply.code(201).send({ mensagem: 'Problema criado com sucesso.', ...resultado });
  } catch (error) {
    if (error instanceof ErroEntrada) {
      return reply.code(400).send({ erro: error.message });
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ erro: 'Há nomes duplicados nos dados enviados.' });
    }

    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro interno do servidor.' });
  }
}
