import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { CreateLoanDtoSchema } = await import('../../../dist/application/dto/loan/create-loan.dto.js');
    const { CreateLoanUseCase } = await import('../../../dist/application/use-case/loan/create-loan.use-case.js');
    const { GetLoansUseCase } = await import('../../../dist/application/use-case/loan/get-loans.use-case.js');
    const { container } = await import('../../../dist/infrastructure/container.js');
    const { createHandler, createGetHandler, sendResponse } = await import('../../../dist/interface/handler-factory.js');
    const { withAuth } = await import('../../../dist/interface/middleware/with-auth.js');
    const { withCors } = await import('../../../dist/interface/middleware/with-cors.js');
    const { Response } = await import('../../../dist/interface/response.js');

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

    const mainHandler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
      if (req.method === 'POST') return postHandler(req, res);
      if (req.method === 'GET') return getHandler(req, res);
      sendResponse(res, Response.badRequest('Method not allowed'));
    };

    return withCors(withAuth(mainHandler))(req, res);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
  }
}
