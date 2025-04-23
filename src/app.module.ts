import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SupabaseModule } from './db/supabase.module';
import { AgentModule } from './modules/agent/agent.module';

@Module({
  imports: [ConfigModule, SupabaseModule, AgentModule],
  controllers: [],
  providers: [],
  exports: [ConfigModule, SupabaseModule, AgentModule],
})
export class AppModule {}
