import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreateIncomeEventDtoSchema } from '../../../src/application/dto/income-event/create-income-event.dto.js';
import { CreateIncomeEventUseCase } from '../../../src/application/use-case/income-event/create-income-event.use-case.js';
import { GetIncomeEventsUseCase } from '../../../src/application/use-case/income-event/get-income-events.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const createIncomeEventUseCase = new CreateIncomeEventUseCase(container.incomeEventRepo);
const getIncomeEventsUseCase = new GetIncomeEventsUseCase(container.incomeEventRepo);

const postHandler = createHandler({
  operationName: 'CreateIncomeEvent',
  schema: CreateIncomeEventDtoSchema,
  execute: async (dto) => {
    const result = await createIncomeEventUseCase.execute(dto);
    return Response.created(result);
  },
});

const getHandler = createGetHandler({
  operationName: 'GetIncomeEvents',
  execute: async (req) => {
    const workerId = req.query.worker_id as string;
    const result = await getIncomeEventsUseCase.execute(workerId);
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  if (req.method === 'GET') return getHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
