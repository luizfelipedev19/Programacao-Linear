CREATE DATABASE IF NOT EXISTS projeto_linear;

USE projeto_linear;

-- 1. PROBLEMAS E CENÁRIOS

CREATE TABLE problema (
    id_problema INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    objetivo ENUM('MIN', 'MAX') NOT NULL,
    id_problema_origem INT NULL,
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_problema_origem
        FOREIGN KEY (id_problema_origem)
        REFERENCES problema(id_problema)
        ON DELETE SET NULL
);

-- 2. ALIMENTOS

CREATE TABLE alimento (
    id_alimento INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    proteina DECIMAL(12,4) NOT NULL DEFAULT 0,
    energia DECIMAL(12,4) NOT NULL DEFAULT 0,
    fosforo DECIMAL(12,4) NOT NULL DEFAULT 0,
    calcio DECIMAL(12,4) NOT NULL DEFAULT 0,
    lisina DECIMAL(12,4) NOT NULL DEFAULT 0,
    custo_kg DECIMAL(12,4) NOT NULL DEFAULT 0,

    CONSTRAINT uq_alimento_nome
        UNIQUE (nome)
);

-- 3. VARIÁVEIS DE DECISÃO

CREATE TABLE variavel_decisao (
    id_variavel INT AUTO_INCREMENT PRIMARY KEY,
    id_problema INT NOT NULL,
    id_alimento INT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    unidade VARCHAR(30),
    inteira BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_variavel_nome
        UNIQUE (id_problema, nome),

    CONSTRAINT fk_variavel_problema
        FOREIGN KEY (id_problema)
        REFERENCES problema(id_problema)
        ON DELETE CASCADE,

    CONSTRAINT fk_variavel_alimento
        FOREIGN KEY (id_alimento)
        REFERENCES alimento(id_alimento)
        ON DELETE SET NULL
);


-- 4. FUNÇÃO OBJETIVO

CREATE TABLE funcao_objetivo (
    id_funcao INT AUTO_INCREMENT PRIMARY KEY,
    id_problema INT NOT NULL,
    id_variavel INT NOT NULL,
    coeficiente DECIMAL(12,4) NOT NULL,

    CONSTRAINT uq_fo_problema_variavel
        UNIQUE (id_problema, id_variavel),

    CONSTRAINT fk_funcao_problema
        FOREIGN KEY (id_problema)
        REFERENCES problema(id_problema)
        ON DELETE CASCADE,

    CONSTRAINT fk_funcao_variavel
        FOREIGN KEY (id_variavel)
        REFERENCES variavel_decisao(id_variavel)
        ON DELETE CASCADE
);


-- 5. RESTRIÇÕES

CREATE TABLE restricao (
    id_restricao INT AUTO_INCREMENT PRIMARY KEY,
    id_problema INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    sinal ENUM('<=', '>=', '=') NOT NULL,
    valor DECIMAL(12,4) NOT NULL,
    unidade VARCHAR(30),

    CONSTRAINT uq_restricao_nome
        UNIQUE (id_problema, nome),

    CONSTRAINT fk_restricao_problema
        FOREIGN KEY (id_problema)
        REFERENCES problema(id_problema)
        ON DELETE CASCADE
);

-- 6. COEFICIENTES DAS RESTRIÇÕES

CREATE TABLE restricao_variavel (
    id_restricao INT NOT NULL,
    id_variavel INT NOT NULL,
    coeficiente DECIMAL(12,4) NOT NULL DEFAULT 0,

    PRIMARY KEY (id_restricao, id_variavel),

    CONSTRAINT fk_rv_restricao
        FOREIGN KEY (id_restricao)
        REFERENCES restricao(id_restricao)
        ON DELETE CASCADE,

    CONSTRAINT fk_rv_variavel
        FOREIGN KEY (id_variavel)
        REFERENCES variavel_decisao(id_variavel)
        ON DELETE CASCADE
);

-- 7. RESULTADOS DAS EXECUÇÕES

CREATE TABLE resultado (
    id_resultado INT AUTO_INCREMENT PRIMARY KEY,
    id_problema INT NOT NULL,
    valor_objetivo DECIMAL(14,4),
    status ENUM(
        'PENDENTE',
        'OTIMO',
        'INVIAVEL',
        'ILIMITADO',
        'ERRO'
    ) NOT NULL DEFAULT 'PENDENTE',
    data_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resultado_problema
        FOREIGN KEY (id_problema)
        REFERENCES problema(id_problema)
        ON DELETE CASCADE
);

-- 8. VALORES DAS VARIÁVEIS EM CADA RESULTADO

CREATE TABLE resultado_variavel (
    id_resultado INT NOT NULL,
    id_variavel INT NOT NULL,
    valor DECIMAL(14,4) NOT NULL,

    PRIMARY KEY (id_resultado, id_variavel),

    CONSTRAINT fk_resultado_variavel_resultado
        FOREIGN KEY (id_resultado)
        REFERENCES resultado(id_resultado)
        ON DELETE CASCADE,

    CONSTRAINT fk_resultado_variavel_variavel
        FOREIGN KEY (id_variavel)
        REFERENCES variavel_decisao(id_variavel)
        ON DELETE CASCADE
);

-- 9. VERIFICAÇÃO DAS RESTRIÇÕES NOS RESULTADOS

CREATE TABLE resultado_restricao (
    id_resultado INT NOT NULL,
    id_restricao INT NOT NULL,
    valor_calculado DECIMAL(14,4) NOT NULL,
    folga DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    atendida BOOLEAN NOT NULL,

    PRIMARY KEY (id_resultado, id_restricao),

    CONSTRAINT fk_resultado_restricao_resultado
        FOREIGN KEY (id_resultado)
        REFERENCES resultado(id_resultado)
        ON DELETE CASCADE,

    CONSTRAINT fk_resultado_restricao_restricao
        FOREIGN KEY (id_restricao)
        REFERENCES restricao(id_restricao)
        ON DELETE CASCADE
);

-- 10. ÍNDICE PARA CONSULTA DO HISTÓRICO

CREATE INDEX idx_resultado_problema_data
    ON resultado (id_problema, data_calculo);
