import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './services/agent.service';
import { ConfigModule } from '../../config/config.module';
import { SupabaseModule } from '../../db/supabase.module';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
