import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({
    description: 'Message to be processed by the agent',
    example:
      'How are you? give me a random table with 5 rows and 3 columns with 5 world of warcraft bosses',
  })
  message: string;

  @ApiProperty({
    description: 'Thread ID for conversation context',
    example: '1',
    required: false,
  })
  threadId?: string;
}
