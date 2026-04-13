import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreateWorkerDtoSchema } from '../../../src/application/dto/worker/create-worker.dto.js';
import { CreateWorkerUseCase } from '../../../src/application/use-case/worker/create-worker.use-case.js';
import { GetWorkersUseCase } from '../../../src/application/use-case/worker/get-workers.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const createWorkerUseCase = new CreateWorkerUseCase(container.workerRepo);
const getWorkersUseCase = new GetWorkersUseCase(container.workerRepo);

const postHandler = createHandler({
  operationName: 'CreateWorker',
  schema: CreateWorkerDtoSchema,
  execute: async (dto) => {
    const result = await createWorkerUseCase.execute(dto);
    return Response.created(result);
  },
});

const getHandler = createGetHandler({
  operationName: 'GetWorkers',
  execute: async () => {
    const result = await getWorkersUseCase.execute();
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  if (req.method === 'GET') return getHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
