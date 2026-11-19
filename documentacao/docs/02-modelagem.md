---
sidebar_position: 2
title: Modelagem
---

# Modelagem em Programação Linear

## Variáveis de decisão

Cada variável $x_j$ é a **fração de 1 kg de ração** ocupada pelo ingrediente $j$. Como a ração tem 1 kg, as frações somam 1, e $x_j \ge 0$.

## Função objetivo

Minimizar o custo de 1 kg de ração, onde $c_j$ é o preço por kg do ingrediente $j$:

$$
\min Z = \sum_{j} c_j \, x_j
$$

## Restrições

Para cada nutriente $i$ (proteína, energia, fósforo, cálcio e lisina), com $a_{ij}$ o teor do nutriente $i$ no ingrediente $j$:

$$
L_i \;\le\; \sum_{j} a_{ij} \, x_j \;\le\; U_i
$$

Além disso, valem as restrições de composição:

$$
\sum_{j} x_j = 1 \qquad \text{e} \qquad x_j \ge 0
$$

Algumas frações têm limite próprio (por exemplo, farinha de carne no máximo 3%) ou valor fixo (sal em 0,5%).

## Dados do exemplo: ração de suínos de 30 a 60 kg

| Ingrediente | Proteína (%) | Energia (kcal/kg) | Fósforo (%) | Cálcio (%) | Lisina (%) | Custo (R$/kg) |
| --- | --- | --- | --- | --- | --- | --- |
| Milho | 8,51 | 3493 | 0,27 | 0,02 | 0,23 | 1,80 |
| Farinha de soja | 45,6 | 3378 | 0,55 | 0,36 | 2,87 | 4,20 |
| Farelo de trigo | 15,3 | 2103 | 0,88 | 0,12 | 0,57 | 2,00 |
| Farinha de carne | 45,2 | 2133 | 5,4 | 11,6 | 2,28 | 7,50 |
| Farinha de sangue | 80,9 | 2809 | 0,15 | 0,2 | 6,57 | 9,00 |
| Fosfato bicálcico | 0 | 0 | 17,03 | 22,61 | 0 | 14,50 |
| Cálcio | 0 | 0 | 0 | 37 | 0 | 0,80 |
| Sal | 0 | 0 | 0 | 0 | 0 | 3,00 |
| Mistura mineral | 0 | 0 | 0 | 0 | 0 | 28,00 |
| Mistura vitamínica | 0 | 0 | 0 | 0 | 0 | 145,00 |

| Exigência | Mínimo | Máximo |
| --- | --- | --- |
| Proteína (%) | 15,5 | 16 |
| Energia (kcal/kg) | 3260 | 3360 |
| Fósforo (%) | 0,5 | 0,52 |
| Cálcio (%) | 1,3 | 1,4 |
| Lisina (%) | 0,69 | sem limite |

| Limite de ingrediente | Valor |
| --- | --- |
| Farelo de trigo | no máximo 15% da ração |
| Farinha de carne | no máximo 3% |
| Farinha de sangue | no máximo 2% |
| Sal | fixo em 0,5% |
| Mistura mineral | fixa em 0,1% |
| Mistura vitamínica | fixa em 0,1% |

## Resultado

O solver encontrou solução **ótima**, com custo de **R$ 2,5184 por kg** de ração.

| Ingrediente | Fração | Em 1 kg de ração |
| --- | --- | --- |
| Milho | 0,7343 | 734,3 g |
| Farinha de soja | 0,1572 | 157,2 g |
| Farelo de trigo | 0,0476 | 47,6 g |
| Farinha de carne | 0,0300 | 30,0 g |
| Cálcio | 0,0232 | 23,2 g |
| Sal | 0,0050 | 5,0 g |
| Mistura mineral | 0,0010 | 1,0 g |
| Mistura vitamínica | 0,0010 | 1,0 g |
| Fosfato bicálcico | 0,0007 | 0,7 g |
| Farinha de sangue | 0 | não entra |

### Quais restrições definem o ótimo

Uma restrição está **no limite** quando a ração usa exatamente o mínimo (ou máximo) permitido. São elas que seguram o custo:

- **No limite:** proteína mínima (15,5%), energia mínima (3260 kcal/kg), fósforo mínimo (0,5%), cálcio mínimo (1,3%) e farinha de carne máxima (3%), além das frações fixas e da soma igual a 1.
- **Com folga:** lisina (0,7155% contra mínimo de 0,69%), farelo de trigo (4,8% contra máximo de 15%) e farinha de sangue (0%).

A ração mais barata usa só o mínimo necessário de cada nutriente, por isso as exigências mínimas ficam no limite.
