import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { RelayCallbackUseCase } = await import('../../../dist/application/use-case/webhook/relay-callback.use-case.js');
    const { container } = await import('../../../dist/infrastructure/container.js');
    const { sendResponse } = await import('../../../dist/interface/handler-factory.js');
    const { withCors } = await import('../../../dist/interface/middleware/with-cors.js');
    const { Response } = await import('../../../dist/interface/response.js');

    const useCase = new RelayCallbackUseCase(container.withdrawalRepo);

    const mainHandler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
      if (req.method !== 'POST') {
        sendResponse(res, Response.badRequest('Method not allowed'));
        return;
      }

      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        await useCase.execute(body);
        sendResponse(res, Response.ok({ received: true }));
      } catch {
        sendResponse(res, Response.internalServerError());
      }
    };

    return withCors(mainHandler)(req, res);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
  }
}
