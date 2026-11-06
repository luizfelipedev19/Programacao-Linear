-- Cada alimento passa a pertencer a um usuário (evita que um usuário altere/exclua alimentos de outro).
ALTER TABLE alimento
    ADD COLUMN id_usuario INT NULL;

-- Alimentos já usados por problemas ficam com o dono do problema.
UPDATE alimento a
    JOIN variavel_decisao v ON v.id_alimento = a.id_alimento
    JOIN problema p ON p.id_problema = v.id_problema
SET a.id_usuario = p.id_usuario
WHERE a.id_usuario IS NULL AND p.id_usuario IS NOT NULL;

-- O nome deixa de ser único no sistema inteiro e passa a ser único por usuário.
ALTER TABLE alimento
    ADD CONSTRAINT uq_alimento_usuario_nome UNIQUE (id_usuario, nome);

ALTER TABLE alimento
    ADD CONSTRAINT fk_alimento_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuario(id_usuario)
    ON DELETE RESTRICT;

ALTER TABLE alimento
    DROP INDEX uq_alimento_nome;
