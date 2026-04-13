import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreateLoanDtoSchema } from '../../../src/application/dto/loan/create-loan.dto.js';
import { CreateLoanUseCase } from '../../../src/application/use-case/loan/create-loan.use-case.js';
import { GetLoansUseCase } from '../../../src/application/use-case/loan/get-loans.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createHandler, createGetHandler, sendResponse } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const createLoanUseCase = new CreateLoanUseCase(container.loanRepo);
const getLoansUseCase = new GetLoansUseCase(container.loanRepo);

const postHandler = createHandler({
  operationName: 'CreateLoan',
  schema: CreateLoanDtoSchema,
  execute: async (dto) => {
    const result = await createLoanUseCase.execute(dto);
    return Response.created(result);
  },
});

const getHandler = createGetHandler({
  operationName: 'GetLoans',
  execute: async () => {
    const result = await getLoansUseCase.execute();
    return Response.ok(result);
  },
});

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method === 'POST') return postHandler(req, res);
  if (req.method === 'GET') return getHandler(req, res);
  sendResponse(res, Response.badRequest('Method not allowed'));
};

export default withCors(withAuth(handler));
