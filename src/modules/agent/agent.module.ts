import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { ConfigModule } from '../../config/config.module';
import { SupabaseModule } from '../../db/supabase.module';
import { ChatService } from './services/chat.service';
@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [AgentController],
  providers: [ChatService],
  exports: [ChatService],
})
export class AgentModule {}
