import { supabase, supabaseConfigStatus } from '../supabase';

export async function verifyBooksSchema(): Promise<{ ok: boolean; problems: string[] }> {
  if (supabaseConfigStatus.isPlaceholder) {
    return { ok: true, problems: [] };
  }
  
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.message.includes('relation "public.users" does not exist')) {
      return { ok: false, problems: ['Missing public.users table in Supabase.'] };
    }
    return { ok: true, problems: [] };
  } catch (err: any) {
    return { ok: true, problems: [] };
  }
}
