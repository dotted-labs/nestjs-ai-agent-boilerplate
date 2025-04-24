import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './services/chat.service';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Chat with the AI agent' })
  @ApiResponse({
    status: 200,
    description: 'Stream of AI agent responses',
  })
  @Post('chat')
  async chat(@Body() chatDto: ChatDto, @Res() res: Response) {
    console.log('chatDto:', chatDto);
    await this.chatService.chat(chatDto.message, chatDto.threadId || '', res);
  }
}
