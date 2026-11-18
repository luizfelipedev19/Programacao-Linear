-- Exigências (restrições nutricionais) cadastradas pelo usuário, para reutilizar em várias formulações.
-- nutriente preenchido: os teores vêm do cadastro de alimentos (proteína, energia, fósforo, cálcio, lisina).
-- nutriente nulo: nutriente próprio; teores guarda o teor de cada ingrediente, pelo nome.
CREATE TABLE exigencia (
    id_exigencia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    unidade VARCHAR(30) NOT NULL DEFAULT '%',
    nutriente ENUM('proteina', 'energia', 'fosforo', 'calcio', 'lisina') NULL,
    minimo DECIMAL(12,4) NULL,
    maximo DECIMAL(12,4) NULL,
    teores JSON NULL,
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_exigencia_usuario_nome
        UNIQUE (id_usuario, nome),

    CONSTRAINT fk_exigencia_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);
