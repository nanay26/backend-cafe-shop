import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGroq } from '@langchain/groq';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
const RETRY_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
const MAX_RETRIES = 3;

export interface UpdateMenuDto {
  name?: string;
  price?: number;
  description?: string;
  category?: string;
  image?: string;
}

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);
  private readonly chatHistories: Map<string, string[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  private createModel(model: string) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY tidak di-set. Chatbot akan memakai fallback jawaban statis.',
      );
    }

    return new ChatGroq({
      apiKey: apiKey || '',
      model,
      temperature: 0.7,
      maxTokens: 512,
    });
  }

  async getChatResponse(userQuery: string, sessionId: string = 'default-user') {
    let lastError: any = null;

    if (!process.env.GROQ_API_KEY?.trim()) {
      const menus = await this.prisma.menu.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      const fallbackMenu = menus.map((m) => m.name).join(', ');
      const fallbackReply =
        fallbackMenu.length > 0
          ? `Maaf Kak, Barista sedang sibuk saat ini. Coba pilih salah satu menu favorit kami: ${fallbackMenu}.`
          : 'Maaf Kak, Barista sedang sibuk saat ini. Menu belum tersinkron, silakan coba lagi sebentar ya.';
      return {
        reply: fallbackReply,
        text: fallbackReply,
      };
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const model = RETRY_MODELS[attempt % RETRY_MODELS.length];
      try {
        this.logger.log(`[Attempt ${attempt + 1}/${MAX_RETRIES}] model=${model}`);

        const menus = await this.prisma.menu.findMany();
        const menuContext = menus
          .map((m) => `- ${m.name}: Rp${m.price} (${m.category}). ${m.description}`)
          .join('\n');

        const history = this.chatHistories.get(sessionId) || [];
        const historyString = history.join('\n');

        const template = `Anda adalah "Barista Virtual" yang ramah di Tersenyum Coffee.
      
      INFORMASI OUTLET KAMI:
      - Jam Operasional: 19.00 - 23.59 (Setiap Hari).
      - Fasilitas: WiFi kencang, cocok buat nongkrong, Area Outdoor.
      - Lokasi: Jl. Pekojan, Purwodinatan, Kota Semarang
      
      LOGIKA REKOMENDASI:
      - Jika pelanggan ingin "Less Sugar" atau "Sehat": Sarankan kopi hitam atau menu tanpa susu/sirup dari daftar menu.
      - Jika pelanggan ingin "Segar": Sarankan kategori Non-Coffee atau buah-buahan.
      - Jika pelanggan ingin "Manis/Creamy": Sarankan menu berbasis Latte atau Susu.
      - Selalu tawarkan opsi "Custom" (misal: kurangi gula/es) jika memungkinkan.

      DAFTAR MENU KAMI:
      {context}

      RIWAYAT CHAT:
      {chat_history}

      PERTANYAAN PELANGGAN: {question}
      JAWABAN (Gunakan gaya bahasa santai tapi sopan, panggil "Kak"):`;

        const modelInstance = this.createModel(model);

        const prompt = PromptTemplate.fromTemplate(template);
        const parser = new StringOutputParser();
        const chain = prompt.pipe(modelInstance).pipe(parser);

        const reply = await chain.invoke({
          context: menuContext,
          chat_history: historyString,
          question: userQuery,
        });

        const newHistory = [
          ...history,
          `User: ${userQuery}`,
          `Bot: ${reply}`,
        ].slice(-6);
        this.chatHistories.set(sessionId, newHistory);

        this.logger.log(`[Attempt ${attempt + 1}] SUCCESS model=${model}`);
        return { reply, text: reply };
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

    this.logger.error(`All ${MAX_RETRIES} retries exhausted. Final error: ${lastError?.message || 'Unknown'}`);
    const fallback =
      'Maaf kak, Barista sedang sibuk. Bisa tanya lagi dalam beberapa saat?';
    return { reply: fallback, text: fallback };
  }

  // --- FUNGSI CRUD (DATABASE) ---

  async createMenu(data: { name: string; price: number; description: string; category: string; image: string }) {
    return this.prisma.menu.create({ data });
  }

  async updateMenu(id: number, data: UpdateMenuDto) {
    return this.prisma.menu.update({ where: { id }, data });
  }

  async findAll() {
    return this.prisma.menu.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    return this.prisma.menu.findUnique({ where: { id } });
  }

  async remove(id: number) {
    return this.prisma.menu.delete({ where: { id } });
  }
}
