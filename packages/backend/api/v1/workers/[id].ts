import { GetWorkerByIdUseCase } from '../../../src/application/use-case/worker/get-worker-by-id.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createGetHandler } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const useCase = new GetWorkerByIdUseCase(container.workerRepo);

const handler = createGetHandler({
  operationName: 'GetWorkerById',
  execute: async (req) => {
    const id = req.query.id as string;
    const result = await useCase.execute(id);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
