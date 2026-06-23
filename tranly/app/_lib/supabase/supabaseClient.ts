import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      'Supabase environment variables are missing. Database synchronization may not work correctly.'
    );
  }
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
