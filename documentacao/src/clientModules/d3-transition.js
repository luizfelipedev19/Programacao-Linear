// O Mermaid chama selection.transition() (tooltip dos diagramas), mas o bundler descarta o efeito colateral
// que registra o método. Importar o pacote aqui garante o registro.
import 'd3-transition';
