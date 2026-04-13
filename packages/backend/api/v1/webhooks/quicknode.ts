import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ProcessEscrowEventUseCase } from '../../../src/application/use-case/webhook/process-escrow-event.use-case.js';
import type { EscrowEventPayload } from '../../../src/application/use-case/webhook/process-escrow-event.use-case.js';
import { ProcessLendiProofEventUseCase } from '../../../src/application/use-case/webhook/process-lendi-proof-event.use-case.js';
import type { LendiProofEventPayload } from '../../../src/application/use-case/webhook/process-lendi-proof-event.use-case.js';
import { container } from '../../../src/infrastructure/container.js';
import { sendResponse } from '../../../src/interface/handler-factory.js';
import { withCors } from '../../../src/interface/middleware/with-cors.js';
import { Response } from '../../../src/interface/response.js';

const escrowUseCase = new ProcessEscrowEventUseCase(container.escrowRepo, container.escrowEventRepo);
const lendiProofUseCase = new ProcessLendiProofEventUseCase(container.loanRepo, container.workerRepo);

const handler = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  if (req.method !== 'POST') {
    sendResponse(res, Response.badRequest('Method not allowed'));
    return;
  }

  try {
    const signature = req.headers['x-qn-signature'] as string;
    const nonce = req.headers['x-qn-nonce'] as string;
    const timestamp = req.headers['x-qn-timestamp'] as string;

    if (!signature || !nonce || !timestamp) {
      sendResponse(res, Response.unauthorized('Missing signature headers'));
      return;
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const verifier = container.getQuickNodeVerifier();
    if (!verifier) {
      sendResponse(res, Response.internalServerError('Webhook secret not configured'));
      return;
    }

    if (!verifier.verify(rawBody, signature, nonce, timestamp)) {
      sendResponse(res, Response.unauthorized('Invalid signature'));
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const events = Array.isArray(body) ? body : (body.events ?? []);

    // Separate events by type based on event_type field
    const escrowEvents: EscrowEventPayload[] = [];
    const lendiProofEvents: LendiProofEventPayload[] = [];

    for (const event of events) {
      const eventType = event.event_type;
      if (eventType === 'EscrowCreated' || eventType === 'EscrowSettled') {
        escrowEvents.push(event);
      } else if (eventType === 'IncomeRecorded' || eventType === 'ProofRequested' || eventType === 'EscrowLinked') {
        lendiProofEvents.push(event);
      }
    }

    // Process events in parallel
    await Promise.all([
      escrowEvents.length > 0 ? escrowUseCase.execute(escrowEvents) : Promise.resolve(),
      lendiProofEvents.length > 0 ? lendiProofUseCase.execute(lendiProofEvents) : Promise.resolve(),
    ]);

    sendResponse(res, Response.ok({
      processed: events.length,
      escrow_events: escrowEvents.length,
      lendi_proof_events: lendiProofEvents.length,
    }));
  } catch {
    sendResponse(res, Response.internalServerError());
  }
};

export default withCors(handler);
