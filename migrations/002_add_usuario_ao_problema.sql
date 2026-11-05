ALTER TABLE problema
    ADD COLUMN id_usuario INT NULL;

ALTER TABLE problema
    ADD INDEX idx_problema_usuario (id_usuario);

ALTER TABLE problema
    ADD CONSTRAINT fk_problema_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuario(id_usuario)
    ON DELETE RESTRICT;
