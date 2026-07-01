import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser, unauthorizedResponse } from '@/app/api/_lib/utils/requireUser';

export async function DELETE(): Promise<NextResponse> {
  const user = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Delete user data before removing auth record
    await Promise.all([
      admin.from('words').delete().eq('user_id', user.id),
      admin.from('conversations').delete().eq('user_id', user.id),
      admin.from('word_progress').delete().eq('user_id', user.id),
      admin.from('profiles').delete().eq('id', user.id),
    ]);

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
