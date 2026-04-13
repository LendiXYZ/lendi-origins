import { GetLoanByIdUseCase } from '../../../src/application/use-case/loan/get-loan-by-id.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createGetHandler } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const useCase = new GetLoanByIdUseCase(container.loanRepo);

const handler = createGetHandler({
  operationName: 'GetLoanById',
  execute: async (req) => {
    const id = req.query.id as string;
    const result = await useCase.execute(id);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
