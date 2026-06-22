import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';

// Override global throttle: chatbot lebih ketat (20 request per menit per IP)
@Throttle({ default: { ttl: 60000, limit: 20 } })
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  async askQuestion(@Body('prompt') prompt: string) {
    return this.chatService.getAiResponse(prompt);
  }
}
