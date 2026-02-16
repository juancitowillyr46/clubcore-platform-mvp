import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@/environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
    private readonly clientInstance: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    get client(): SupabaseClient {
        return this.clientInstance;
    }
}
