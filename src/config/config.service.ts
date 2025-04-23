import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('environment') || 'development';
  }

  get port(): number {
    return this.configService.get<number>('port') || 3000;
  }

  get openAiApiKey(): string {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }
    return apiKey;
  }

  get openAiModel(): string {
    return this.configService.get<string>('openai.model') || 'gpt-4o-mini';
  }

  get supabaseUrl(): string {
    const url = this.configService.get<string>('supabase.url');
    if (!url) {
      throw new Error('SUPABASE_URL is not defined');
    }
    return url;
  }

  get supabaseKey(): string {
    const key = this.configService.get<string>('supabase.serviceKey');
    if (!key) {
      throw new Error('SUPABASE_SERVICE_KEY is not defined');
    }
    return key;
  }

  get firecrawlApiKey(): string {
    const apiKey = this.configService.get<string>('firecrawl.apiKey');
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not defined');
    }
    return apiKey;
  }
}
