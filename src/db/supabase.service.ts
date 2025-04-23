import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '../config/config.service';

@Injectable()
export class SupabaseService {
  private _client: SupabaseClient;

  constructor(private configService: ConfigService) {
    this._client = createClient(
      this.configService.supabaseUrl,
      this.configService.supabaseKey,
    );
  }

  get client(): SupabaseClient {
    return this._client;
  }
}
