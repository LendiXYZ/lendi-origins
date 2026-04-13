import { GetLenderByIdUseCase } from '../../../src/application/use-case/lender/get-lender-by-id.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { createGetHandler } from '../../../src/interface/handler-factory.js';
import { withAuth } from '../../../src/interface/middleware/with-auth.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const useCase = new GetLenderByIdUseCase(container.lenderRepo);

const handler = createGetHandler({
  operationName: 'GetLenderById',
  execute: async (req) => {
    const id = req.query.id as string;
    const result = await useCase.execute(id);
    return Response.ok(result);
  },
});

export default withCors(withAuth(handler));
