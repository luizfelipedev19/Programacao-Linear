
import * as controller from '../controllers/problemasControllers.js';

export default async function problemasRoutes(app) {
  app.get('/problemas', controller.listar);
  app.get('/problemas/:id', controller.buscar);
  app.post('/problemas', controller.criar);
  app.put('/problemas/:id', controller.atualizar);
  app.delete('/problemas/:id', controller.excluir);
}
