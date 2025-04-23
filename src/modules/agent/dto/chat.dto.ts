import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({
    description: 'Message to be processed by the agent',
    example: 'What can you do for me?',
  })
  message: string;

  @ApiProperty({
    description: 'Thread ID for conversation context',
    example: '',
    required: false,
  })
  threadId?: string;
}
