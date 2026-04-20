import type { AdvisorRequestDto, AdvisorResponseDto } from '../../application/dto/advisor/advisor-response.dto';

/**
 * Zhipu AI (Z.AI) Advisor Service
 * Provides personalized credit advice in Spanish using GLM-4.5
 */

interface ZhipuMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ZhipuRequest {
  model: string;
  messages: ZhipuMessage[];
  thinking?: { type: 'disabled' };
  response_format?: { type: 'json_object' };
  max_tokens?: number;
  temperature?: number;
}

interface ZhipuResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const SYSTEM_PROMPT = `Eres el asesor financiero de Lendi, una plataforma de crédito para trabajadores informales de América Latina. Tu rol es ayudar a trabajadores como repartidores, vendedores y trabajadoras domésticas a entender su elegibilidad para obtener crédito y qué pasos tomar para mejorarla.

REGLAS CRÍTICAS:
- Responde SIEMPRE en español
- Nunca menciones montos específicos de ingresos
- Sé empático, directo y práctico
- Evita jerga financiera compleja
- Usa "tú" (informal), no "usted"
- Máximo 3 oraciones por campo

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "status": "ready" | "almost" | "not_ready",
  "message": "consejo principal en español",
  "nextStep": "una acción concreta que puede hacer hoy",
  "creditScore": <número del 1 al 100>,
  "encouragement": "frase motivadora corta"
}`;

const FALLBACK_RESPONSE: AdvisorResponseDto = {
  status: 'almost',
  message: 'Estás construyendo tu historial crediticio. Sigue registrando tus ingresos.',
  nextStep: 'Registra tus ingresos de esta semana en Lendi.',
  creditScore: 50,
  encouragement: '¡Cada registro cuenta!',
};

export class ZhipuAdvisorService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint = 'https://api.z.ai/api/paas/v4/chat/completions';
  private readonly timeout = 10000; // 10 seconds

  constructor() {
    this.apiKey = process.env.ZAI_API_KEY ?? '';
    this.model = process.env.ZAI_MODEL ?? 'glm-4.5-flash';

    if (!this.apiKey) {
      console.warn('[ZhipuAdvisorService] ZAI_API_KEY not set, will use fallback responses');
    }
  }

  /**
   * Get personalized credit advice for a worker
   */
  async getAdvice(request: AdvisorRequestDto): Promise<AdvisorResponseDto> {
    // Return fallback if no API key configured
    if (!this.apiKey) {
      return FALLBACK_RESPONSE;
    }

    try {
      const userMessage = this.buildUserMessage(request);
      const zhipuRequest: ZhipuRequest = {
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.6,
      };

      const response = await this.callZhipuAPI(zhipuRequest);
      return this.parseResponse(response);
    } catch (error) {
      console.error('[ZhipuAdvisorService] Error getting advice:', error);
      return FALLBACK_RESPONSE;
    }
  }

  /**
   * Build user message from worker data
   */
  private buildUserMessage(request: AdvisorRequestDto): string {
    const parts = [
      `Trabajador en plataforma: ${request.platform ?? 'economía informal'}`,
      `Registros de ingresos: ${request.incomeRecordsCount}`,
      `Cumple el umbral mínimo: ${request.passesThreshold ? 'Sí' : 'No'}`,
      `Días activo en Lendi: ${request.daysActive}`,
    ];

    if (request.question) {
      parts.push(`Pregunta del trabajador: ${request.question}`);
    }

    parts.push('\nEvalúa su elegibilidad y da consejo personalizado.');

    return parts.join('\n');
  }

  /**
   * Call Zhipu AI API with timeout
   */
  private async callZhipuAPI(request: ZhipuRequest): Promise<ZhipuResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Zhipu API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ZhipuResponse;
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse and validate Zhipu API response
   */
  private parseResponse(response: ZhipuResponse): AdvisorResponseDto {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      const parsed = JSON.parse(content);

      // Validate required fields
      if (
        !parsed.status ||
        !parsed.message ||
        !parsed.nextStep ||
        typeof parsed.creditScore !== 'number' ||
        !parsed.encouragement
      ) {
        throw new Error('Invalid response structure');
      }

      // Ensure valid status
      if (!['ready', 'almost', 'not_ready'].includes(parsed.status)) {
        parsed.status = 'almost';
      }

      // Ensure credit score is in valid range
      parsed.creditScore = Math.max(1, Math.min(100, parsed.creditScore));

      return parsed as AdvisorResponseDto;
    } catch (error) {
      console.error('[ZhipuAdvisorService] Failed to parse response:', error);
      return FALLBACK_RESPONSE;
    }
  }
}

// Singleton instance
export const zhipuAdvisorService = new ZhipuAdvisorService();
