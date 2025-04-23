import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatDto } from './dto/chat.dto';
import { AgentService } from './services/agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatDto, @Res() res: Response) {
    return this.agentService.chat(chatDto.message, chatDto.threadId || '', res);
  }
}
