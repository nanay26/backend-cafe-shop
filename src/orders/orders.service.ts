import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatGroq } from '@langchain/groq';

export interface RawWeeklySales {
  date: string;
  total: number | string | bigint;
}

export interface RawTopMenu {
  name: string;
  totalSold: number | string | bigint;
}

export interface RawGrowthStats {
  current_rev: number | string | bigint | null;
  prev_rev: number | string | bigint | null;
  current_ord: number | string | bigint | null;
  prev_ord: number | string | bigint | null;
}

export interface AnalyticsResponse {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  efficiency: number; // Tambahan field untuk sinkronisasi
  weeklySales: { date: string; total: number }[];
  topMenus: { label: string; sales: number; percentage: number }[];
}

@Injectable()
export class OrdersService {
  private chatHistories: Map<string, string[]> = new Map();
  private model: ChatGroq;

  constructor(private readonly prisma: PrismaService) {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY || '',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
    });
  }

  /**
   * LOGIKA CHATBOT RAG
   */
  async getChatResponse(userQuery: string, sessionId: string = 'default-user') {
    try {
      const [menus, topOrders] = await Promise.all([
        this.prisma.menu.findMany(),
        this.prisma.orderItem.groupBy({
          by: ['menuId'],
          _count: { menuId: true },
          orderBy: { _count: { menuId: 'desc' } },
          take: 20,
        }),
      ]);

      const topMenuIds = topOrders.map((t) => t.menuId);

      const getBestByCat = (keywords: string[]) => {
        return menus
          .filter(
            (m) =>
              topMenuIds.includes(m.id) &&
              keywords.some((key) => m.category.toLowerCase().includes(key)),
          )
          .slice(0, 2)
          .map((m) => m.name)
          .join(', ');
      };

      const coffeeBS = getBestByCat(['kopi', 'coffee']);
      const nonCoffeeBS = getBestByCat([
        'non',
        'milk',
        'tea',
        'minuman',
        'coklat',
        'fresh',
      ]);
      const foodBS = getBestByCat([
        'makan',
        'snack',
        'cemilan',
        'food',
        'roti',
        'kentang',
      ]);

      const bestSellerContext = `
        - Best Seller Kopi: ${coffeeBS || 'Kopi Susu Aren'}
        - Best Seller Non-Kopi: ${nonCoffeeBS || 'Matcha Latte, Lychee Tea'}
        - Best Seller Snack/Makanan: ${foodBS || 'Kentang Goreng, Toast'}
      `;

      const menuContext = menus
        .map(
          (m) =>
            `- ${m.name}: Rp${m.price} [Kategori: ${m.category}]. ${m.description}`,
        )
        .join('\n');

      const history = (this.chatHistories.get(sessionId) || []).join('\n');

      const template = `Anda adalah "Barista Virtual" di TS KOPI.
        
        INFO OUTLET:
        - Jam Buka: 19.30 - 23.59.
        - Fasilitas: WiFi Kencang, Banyak Colokan, Area Outdoor, Mushola.

        DATA PENJUALAN TERLARIS (REAL-TIME):
        {best_seller_context}

        DAFTAR MENU KAMI:
        {context}

        TUGAS ANDA:
        - Jika ditanya rekomendasi "Snack" atau "Makanan", sebutkan dari list Best Seller Snack.
        - Jika ditanya "Minuman selain kopi", sebutkan dari list Best Seller Non-Kopi.
        - Jika ditanya menu sehat, sarankan Americano atau menu tanpa pemanis.
        - Jawab dengan ramah, santai, dan panggil "Kak".

        RIWAYAT CHAT:
        {chat_history}

        PERTANYAAN: {question}
        JAWABAN:`;

      const prompt = PromptTemplate.fromTemplate(template);
      const parser = new StringOutputParser();
      const chain = prompt.pipe(this.model).pipe(parser);

      const reply = await chain.invoke({
        context: menuContext,
        best_seller_context: bestSellerContext,
        chat_history: history,
        question: userQuery,
      });

      const currentHistory = this.chatHistories.get(sessionId) || [];
      const updatedHistory = [
        ...currentHistory,
        `User: ${userQuery}`,
        `Bot: ${reply}`,
      ].slice(-6);
      this.chatHistories.set(sessionId, updatedHistory);

      return { reply };
    } catch (error) {
      console.error('Chat Error:', error);
      return {
        reply: 'Maaf kak, Barista lagi sibuk di kasir. Tanya lagi sebentar ya!',
      };
    }
  }

  // --- FUNGSI CRUD & ANALYTICS ---

  async create(data: {
    customerName: string;
    items: Array<{
      menuId: number;
      name: string;
      price: number;
      qty: number;
      variant: string;
      note?: string;
    }>;
    total: number;
  }) {
    return this.prisma.order.create({
      data: {
        customerName: data.customerName,
        total: data.total,
        status: 'pending',
        items: {
          create: data.items.map((item) => ({
            menuId: item.menuId,
            name: item.name,
            price: item.price,
            qty: item.qty,
            variant: item.variant,
            note: item.note,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order #${id} tidak ditemukan`);
    return order;
  }

  async findByCustomer(name: string) {
    return this.prisma.order.findMany({
      where: { customerName: { contains: name, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async updateStatus(id: number, status: string, paymentMethod?: string) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...(paymentMethod ? { paymentMethod } : {}),
      } as any,
      include: { items: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }

  async getAnalytics(): Promise<AnalyticsResponse> {
    try {
      const aggregation = await this.prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
      });

      const growthData = await this.prisma.$queryRaw<RawGrowthStats[]>`
        SELECT 
          SUM(total) FILTER (WHERE "createdAt" > CURRENT_DATE - INTERVAL '7 days') as current_rev,
          SUM(total) FILTER (WHERE "createdAt" BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '7 days') as prev_rev,
          COUNT(id) FILTER (WHERE "createdAt" > CURRENT_DATE - INTERVAL '7 days') as current_ord,
          COUNT(id) FILTER (WHERE "createdAt" BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '7 days') as prev_ord
        FROM "Order"
      `;

      const stats = growthData[0];

      const calculateGrowth = (
        curr: number | string | bigint | null,
        prev: number | string | bigint | null,
      ): number => {
        const currentVal = Number(curr || 0);
        const prevVal = Number(prev || 0);
        if (prevVal === 0) return currentVal > 0 ? 100 : 0;
        return parseFloat(
          (((currentVal - prevVal) / prevVal) * 100).toFixed(1),
        );
      };

      const revenueGrowth = calculateGrowth(stats.current_rev, stats.prev_rev);
      const orderGrowth = calculateGrowth(stats.current_ord, stats.prev_ord);

      const weeklySales = await this.prisma.$queryRaw<RawWeeklySales[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as date, SUM(total) as total
        FROM "Order"
        WHERE "createdAt" > CURRENT_DATE - INTERVAL '7 days'
        GROUP BY date ORDER BY date ASC
      `;

      const topMenusRaw = await this.prisma.$queryRaw<RawTopMenu[]>`
        SELECT name, SUM(qty) as "totalSold"
        FROM "OrderItem"
        GROUP BY name ORDER BY "totalSold" DESC LIMIT 4
      `;

      const totalRevenue = Number(aggregation._sum.total || 0);
      const totalOrders = Number(aggregation._count.id || 0);
      const maxSold =
        topMenusRaw.length > 0 ? Number(topMenusRaw[0].totalSold) : 0;

      // HITUNG EFFICIENCY (Contoh: Rasio order yang sudah selesai)
      const completedOrders = await this.prisma.order.count({
        where: { status: 'completed' },
      });
      const efficiencyValue =
        totalOrders > 0
          ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(1))
          : 0; // 0 jika belum ada data order

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        revenueGrowth,
        orderGrowth,
        efficiency: efficiencyValue, // Data ini dikirim ke frontend
        weeklySales: weeklySales.map((item) => ({
          date: item.date,
          total: Number(item.total),
        })),
        topMenus: topMenusRaw.map((menu) => ({
          label: menu.name,
          sales: Number(menu.totalSold),
          percentage:
            maxSold > 0 ? (Number(menu.totalSold) / maxSold) * 100 : 0,
        })),
      };
    } catch (error) {
      console.error('Analytics Error:', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        revenueGrowth: 0,
        orderGrowth: 0,
        efficiency: 0,
        weeklySales: [],
        topMenus: [],
      };
    }
  }
}
