---
sidebar_position: 6
title: Testes
---

# Testes e resultados

## Casos resolvidos pelo sistema

O sistema resolve o problema do enunciado e qualquer outro problema linear. Os casos abaixo podem ser cadastrados pelo Swagger (`POST /problemas/completo`).

| Caso | Tipo | O que mostra |
| --- | --- | --- |
| Mistura simples de 2 variáveis | Minimização | Mostra o modelo básico: custo mínimo com uma restrição de proteína e a soma das frações igual a 1. |
| Ração de suínos de 30 a 60 kg | Minimização | O problema do trabalho: 10 variáveis e 16 restrições. |
| Problema de maximização | Maximização | Mostra que o mesmo sistema também maximiza. |

### Resultado da ração

Status `OTIMO`, custo de **R$ 2,5184 por kg**. A receita completa e as restrições no limite estão em [Modelagem](./modelagem#resultado).

## Verificações da API

| Verificação | Resultado esperado |
| --- | --- |
| Rota protegida sem token | 401 |
| Acessar problema ou ingrediente de outro usuário (IDOR) | 404 |
| E-mail já cadastrado | 409 |
| Senha atual errada ao trocar a senha ou excluir a conta | 403, nada é alterado |
| Nova senha com menos de 8 caracteres | 400 |
| Excesso de tentativas de login ou cadastro | 429 |
| Excluir a conta com ingredientes e problemas cadastrados | 204; nada do usuário sobra no banco |
| Modelo sem solução | status `INVIAVEL` |

## Verificações do frontend

| Verificação | Resultado |
| --- | --- |
| Fluxo de conta: alterar dados, trocar senha, excluir conta | Funciona de ponta a ponta |
| Guia de 14 passos | Cada passo destaca o elemento certo |
| Auditoria de acessibilidade (axe-core) | 0 violações, nos modos normal e alto contraste |
| Layout em celular | Sem rolagem horizontal |
