import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatDto } from './dto/chat.dto';
import { AgentService } from './services/agent.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @ApiOperation({ summary: 'Chat with the AI agent' })
  @ApiResponse({
    status: 200,
    description: 'Stream of AI agent responses',
  })
  @Post('chat')
  async chat(@Body() chatDto: ChatDto, @Res() res: Response) {
    const result = await this.agentService.chat(
      chatDto.message,
      chatDto.threadId || '',
      res,
    );

    return res.json(result);
  }
}
