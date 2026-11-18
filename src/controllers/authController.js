import bcrypt from 'bcryptjs';

import {
  atualizarSenha,
  atualizarUsuario,
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  criarUsuario,
  excluirUsuarioComDados
} from '../repositories/usuariosRepository.js';

// Hash descartável: compara a senha mesmo quando o e-mail não existe, para o tempo de
// resposta não revelar quais e-mails têm conta.
const HASH_FALSO = bcrypt.hashSync('senha-falsa-para-igualar-o-tempo', 12);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dadosValidos({ nome, email, senha }, exigirNome = true) {
  return (
    (!exigirNome || (typeof nome === 'string' && nome.trim().length >= 2)) &&
    typeof email === 'string' && EMAIL.test(email.trim()) &&
    typeof senha === 'string' && senha.length >= 8
  );
}

function usuarioPublico(usuario) {
  return {
    id_usuario: usuario.id_usuario,
    nome: usuario.nome,
    email: usuario.email,
    data_criacao: usuario.data_criacao
  };
}

export async function cadastrar(request, reply) {
  try {
    const dados = request.body ?? {};
    if (!dadosValidos(dados)) {
      return reply.code(400).send({
        erro: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.'
      });
    }

    const email = dados.email.trim().toLowerCase();
    const senhaHash = await bcrypt.hash(dados.senha, 12);
    const idUsuario = await criarUsuario({
      nome: dados.nome.trim(),
      email,
      senhaHash
    });

    const usuario = { id_usuario: idUsuario, nome: dados.nome.trim(), email };
    const token = await reply.jwtSign(usuario, { expiresIn: '8h' });

    return reply.code(201).send({ usuario, token });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ erro: 'Este e-mail já está cadastrado.' });
    }

    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro ao cadastrar usuário.' });
  }
}

export async function login(request, reply) {
  try {
    const dados = request.body ?? {};
    if (!dadosValidos(dados, false)) {
      return reply.code(400).send({
        erro: 'Informe e-mail válido e senha com pelo menos 8 caracteres.'
      });
    }

    const usuario = await buscarUsuarioPorEmail(dados.email.trim().toLowerCase());
    const senhaConfere = await bcrypt.compare(dados.senha, usuario?.senha_hash ?? HASH_FALSO) && Boolean(usuario);

    if (!senhaConfere) {
      return reply.code(401).send({ erro: 'E-mail ou senha inválidos.' });
    }

    const usuarioResposta = usuarioPublico(usuario);
    const token = await reply.jwtSign({
      id_usuario: usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email
    }, { expiresIn: '8h' });

    return { usuario: usuarioResposta, token };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro ao realizar login.' });
  }
}

export async function perfil(request) {
  return {
    usuario: {
      id_usuario: request.user.id_usuario,
      nome: request.user.nome,
      email: request.user.email
    }
  };
}

export async function atualizarPerfil(request, reply) {
  try {
    const { nome, email } = request.body;
    const emailNormalizado = email.trim().toLowerCase();
    const afetadas = await atualizarUsuario(request.user.id_usuario, {
      nome: nome.trim(),
      email: emailNormalizado
    });

    if (!afetadas) {
      return reply.code(404).send({ erro: 'Usuário não encontrado.' });
    }

    // nome e e-mail vão dentro do token; emite outro para o perfil não ficar desatualizado
    const usuario = { id_usuario: request.user.id_usuario, nome: nome.trim(), email: emailNormalizado };
    const token = await reply.jwtSign(usuario, { expiresIn: '8h' });

    return { usuario, token };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ erro: 'Este e-mail já está cadastrado.' });
    }

    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro ao atualizar o perfil.' });
  }
}

// Confirma a senha atual antes de operações sensíveis (trocar senha, excluir conta).
async function confirmarSenha(request, reply, senha) {
  const usuario = await buscarUsuarioPorId(request.user.id_usuario);
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    reply.code(403).send({ erro: 'Senha atual incorreta.' });
    return null;
  }

  return usuario;
}

export async function alterarSenha(request, reply) {
  try {
    const { senhaAtual, novaSenha } = request.body;
    if (!(await confirmarSenha(request, reply, senhaAtual))) return;

    await atualizarSenha(request.user.id_usuario, await bcrypt.hash(novaSenha, 12));
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro ao alterar a senha.' });
  }
}

export async function excluirConta(request, reply) {
  try {
    if (!(await confirmarSenha(request, reply, request.body.senha))) return;

    await excluirUsuarioComDados(request.user.id_usuario);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ erro: 'Erro ao excluir a conta.' });
  }
}
