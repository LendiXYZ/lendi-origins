import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { RequestNonceDtoSchema } = await import('../../../../dist/application/dto/auth/request-nonce.dto.js');
    const { RequestNonceUseCase } = await import('../../../../dist/application/use-case/auth/request-nonce.use-case.js');
    const { container } = await import('../../../../dist/infrastructure/container.js');
    const { createHandler } = await import('../../../../dist/interface/handler-factory.js');
    const { withCors } = await import('../../../../dist/interface/middleware/with-cors.js');
    const { Response } = await import('../../../../dist/interface/response.js');

    const useCase = new RequestNonceUseCase(container.nonceService);

    const handler = createHandler({
      operationName: 'RequestNonce',
      schema: RequestNonceDtoSchema,
      execute: async (dto) => {
        const result = await useCase.execute(dto);
        return Response.ok(result);
      },
    });

    return withCors(handler)(req, res);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
  }
}
