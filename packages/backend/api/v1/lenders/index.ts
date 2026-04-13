import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreateLenderDtoSchema } from '../../../src/application/dto/lender/create-lender.dto.js';
import { CreateLenderUseCase } from '../../../src/application/use-case/lender/create-lender.use-case.js';
import { GetLendersUseCase } from '../../../src/application/use-case/lender/get-lenders.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const createLenderUseCase = new CreateLenderUseCase(container.lenderRepo);
const getLendersUseCase = new GetLendersUseCase(container.lenderRepo);

const postHandler = createHandler({
  operationName: 'CreateLender',
  schema: CreateLenderDtoSchema,
  execute: async (dto) => {
    const result = await createLenderUseCase.execute(dto);
    return Response.created(result);
  },
});

const getHandler = createGetHandler({
  operationName: 'GetLenders',
  execute: async () => {
    const result = await getLendersUseCase.execute();
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  if (req.method === 'GET') return getHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
