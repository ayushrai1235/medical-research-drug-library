import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let serviceClientInstance: SupabaseClient<Database> | null = null;

export function getServiceRoleSupabaseClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on server');
  }

  if (!serviceClientInstance) {
    serviceClientInstance = createClient<Database>(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serviceClientInstance;
}

