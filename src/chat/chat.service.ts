import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';

const RETRY_MODELS = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms),
    ),
  ]);
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      this.logger.error(
        'GROQ_API_KEY tidak di-set! Chatbot tidak akan berfungsi. ' +
        'Tambahkan GROQ_API_KEY ke file .env',
      );
    }
    this.groq = new Groq({ apiKey: apiKey || '' });
  }

  async getAiResponse(userPrompt: string) {
    if (!process.env.GROQ_API_KEY?.trim()) {
      return {
        status: 'success',
        text: 'Maaf Kak, AI sedang offline. Coba tanya menu, jam operasional, atau rekomendasi kopi favorit ya.',
        reply: 'Maaf Kak, AI sedang offline. Coba tanya menu, jam operasional, atau rekomendasi kopi favorit ya.',
      };
    }

    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const model = RETRY_MODELS[attempt % RETRY_MODELS.length];
      try {
        this.logger.log(`[Attempt ${attempt + 1}/${MAX_RETRIES}] model=${model} prompt="${userPrompt.slice(0, 60)}"`);

        const completion = await withTimeout(
          this.groq.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'Kamu adalah Barista Digital TS KOPI. Jawab ramah, singkat, dan informatif. Panggil user "Kak". Jika ditanya menu, berikan rekomendasi dari menu yang tersedia.',
              },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 512,
          }),
          TIMEOUT_MS,
          `Groq ${model}`,
        );

        const aiResponse = String(
          completion.choices[0]?.message?.content || '',
        ).trim();

        if (!aiResponse) {
          throw new Error('Empty response from Groq');
        }

        this.logger.log(`[Attempt ${attempt + 1}] SUCCESS model=${model}`);
        return { status: 'success', text: aiResponse, reply: aiResponse };
      } catch (error: any) {
        lastError = error;
        this.logger.error(
          `[Attempt ${attempt + 1}/${MAX_RETRIES}] FAILED model=${model}: ${error?.message || error}`,
        );
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    const errMsg = lastError?.message || 'Unknown error';
    this.logger.error(`All ${MAX_RETRIES} retries exhausted. Final error: ${errMsg}`);
    return {
      status: 'error',
      text: 'Maaf kak, layanan AI sedang sibuk. Coba lagi dalam beberapa saat ya.',
      reply: 'Maaf kak, layanan AI sedang sibuk. Coba lagi dalam beberapa saat ya.',
      error: errMsg,
    };
  }
}
