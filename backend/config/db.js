import { createClient } from '@supabase/supabase-js';
import env from './env.js';

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(
  env.SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY || 'dummy-key',
  {
    auth: { persistSession: false },
  }
);

export default supabase;
