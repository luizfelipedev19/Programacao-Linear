
import * as controller from '../controllers/alimentosControllers.js';

export default async function alimentosRoutes(app) {
  app.get('/alimentos', controller.listar);
  app.get('/alimentos/:id', controller.buscar);
  app.post('/alimentos', controller.criar);
  app.put('/alimentos/:id', controller.atualizar);
  app.delete('/alimentos/:id', controller.excluir);
}
